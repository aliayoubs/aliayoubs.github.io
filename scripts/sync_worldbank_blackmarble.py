#!/usr/bin/env python3
"""TON 618: import published World Bank Space2Stats monthly ADM2 Black Marble.

This script imports OBSERVED values only, never simulates or fills missing months.
It first tries the public World Bank filtered data API; if the API is unavailable,
it streams the World Bank's large yearly CSVs and keeps only Lebanon records.

Usage:
  python scripts/sync_worldbank_blackmarble.py --years 2023 2024 2025
  python scripts/sync_worldbank_blackmarble.py --input C:/Downloads/ntl_adm2_monthly_2025.csv

The published 2023–2025 tables use ISO_A3, NAM_2, date, ntl_mean, and
ntl_quality_prop_0_good. Alternate documented field aliases are also accepted.
If a schema stops matching, fail rather than guessing a district or metric.
"""
from __future__ import annotations
import argparse
import csv
import io
import json
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone

# The official catalog lists each yearly global CSV at approximately 223 MB.
# A server-side short response must never be mistaken for a complete data year.
MIN_GLOBAL_BYTES = 100_000_000
MIN_GLOBAL_ROWS = 100_000
from pathlib import Path

DATASET='https://datacatalog.worldbank.org/search/dataset/0066940/space2stats-monthly-annual-black-marble-nighttime-lights'
RESOURCES={
    2023:('DR0095697','ntl_adm2_monthly_2023.csv'),
    2024:('DR0095698','ntl_adm2_monthly_2024.csv'),
    2025:('DR0095699','ntl_adm2_monthly_2025.csv'),
}
NAMES=['Beirut','Aley','Baabda','Chouf','El Meten','Jbeil','Kesrwane','Akkar','Bcharre','El Batroun','El Koura','El Minieh-Dennie','Tripoli','Zgharta','Saida','Sour','Jezzine','Bent Jbeil','El Nabatieh','Hasbaya','Marjaayoun','Rachaya','West Bekaa','Zahle','Baalbek','El Hermel']

def clean(text):
    s=unicodedata.normalize('NFKD',str(text)).encode('ascii','ignore').decode('ascii').lower()
    return re.sub(r'[^a-z0-9]+','',s)

ALIAS={clean(x):x for x in NAMES}
ALIAS.update({clean(alias):district for alias,district in {
    'Bint Jubail':'Bent Jbeil','El Metn':'El Meten','Hasbaiya':'Hasbaya','Jubail':'Jbeil',
    'Kasrouane':'Kesrwane','Minieh-Danieh':'El Minieh-Dennie','Nabatiye':'El Nabatieh','Rachiaya':'Rachaya',
    'Bint Jbeil':'Bent Jbeil','Bint Jbail':'Bent Jbeil','Bint Jubayl':'Bent Jbeil','Bent Jubayl':'Bent Jbeil','Bint Jbayl':'Bent Jbeil',
    'Marjayoun':'Marjaayoun','Marjayun':'Marjaayoun','Marjeyoun':'Marjaayoun','Marj Aayoun':'Marjaayoun','Marj Aoun':'Marjaayoun',
    'Tyre':'Sour','Tyr':'Sour','Sur':'Sour','Saida (Sidon)':'Saida','Sidon':'Saida',
    'Kesrouan':'Kesrwane','Kesrwan':'Kesrwane','Keserwan':'Kesrwane','Kesrouane':'Kesrwane',
    'Matn':'El Meten','Metn':'El Meten','El Matn':'El Meten',
    'Minieh-Danniyeh':'El Minieh-Dennie','Minieh-Danniye':'El Minieh-Dennie','Minieh-Dinniyeh':'El Minieh-Dennie','Minieh Danniyeh':'El Minieh-Dennie',
    'Miniyeh-Dennieh':'El Minieh-Dennie','Minieh-Dennie':'El Minieh-Dennie',
    'Jubayl':'Jbeil','Jbail':'Jbeil','Byblos':'Jbeil',
    'Batroun':'El Batroun','Batroun District':'El Batroun','Koura':'El Koura','Nabatieh':'El Nabatieh','Nabatiyeh':'El Nabatieh',
    'Hermel':'El Hermel','Bsharri':'Bcharre','Bcharri':'Bcharre','Becharre':'Bcharre',
    'Chouf':'Chouf','Shouf':'Chouf','Shuf':'Chouf','Jezzine':'Jezzine','Jazzine':'Jezzine',
    'Rashaya':'Rachaya','Rashayya':'Rachaya','Western Bekaa':'West Bekaa','Beqaa West':'West Bekaa',
    'Baalbeck':'Baalbek','Zahlé':'Zahle','Beyrouth':'Beirut',
}.items()})

COUNTRY_FIELDS=['ISO_A3','iso3','iso3c','adm0_iso3','adm0_iso','country_iso3','country_code','iso','country','adm0_name','name_0','gid_0','adm0']
DISTRICT_FIELDS=['NAM_2','adm2_name','admin2_name','name_2','district','district_name','adm2_en','adm2','name2','shape_name','shapename','adm2name','adm2_nm']
YEAR_FIELDS=['year','yr','yyyy']
MONTH_FIELDS=['month','mn','mm']
DATE_FIELDS=['date','period','time','year_month','yearmonth','ym']
RADIANCE_FIELDS=['ntl_mean','ntl_mean_all','mean_ntl','ntl_mean_noflares','mean_radiance','radiance_mean','mean_corrected_radiance','ntl_avg','average_radiance','radiance_nw_cm2_sr','mean','ntl']
QUALITY_FIELDS=['ntl_quality_prop_0_good','prop_quality_0','prop_qa_0','pct_good','pct_good_quality','good_pixel_fraction','quality_0_fraction','frac_quality_0']
VALID_FIELDS=['valid_pixel_count','valid_pixels','n_valid','n_pixels_valid','num_valid_pixels','pixel_count']

def keymap(row):
    return {clean(k):k for k in row if k is not None}

def field(row,names):
    keys=keymap(row)
    for n in names:
        if clean(n) in keys: return row.get(keys[clean(n)])
    return None

def has_field(row,names):
    keys=keymap(row)
    return any(clean(n) in keys for n in names)

def country_ok(row):
    value=field(row,COUNTRY_FIELDS)
    if value is None:
        # A country column is mandatory: do not accidentally select wrong country.
        return False
    return clean(value) in ('lbn','lb','lebanon')

def district_name(row):
    raw=field(row,DISTRICT_FIELDS)
    if not raw: return None
    name=clean(raw)
    return ALIAS.get(name)

def period_for(row,forced_year):
    date=field(row,DATE_FIELDS)
    if date:
        m=re.search(r'(?<!\d)(20\d{2})[-/]?(1[0-2]|0?[1-9])(?=$|[-/T\sZ])',str(date))
        if m: return f'{int(m.group(1)):04d}-{int(m.group(2)):02d}'
    year=field(row,YEAR_FIELDS); month=field(row,MONTH_FIELDS)
    try:
        y=int(float(year)) if year is not None and str(year).strip() else forced_year
        m=int(float(month))
        if 2012<=y<=2026 and 1<=m<=12:return f'{y:04d}-{m:02d}'
    except (ValueError, TypeError): pass
    return None

def find_radiance_field(row):
    keys=keymap(row)
    for candidate in RADIANCE_FIELDS:
        if clean(candidate) in keys:return keys[clean(candidate)]
    # Do NOT silently choose an arbitrary mean: flare-adjusted/weighted means differ.
    return None

def number(value):
    if value is None:return None
    try:
        n=float(str(value).strip())
        return n if n==n and abs(n)!=float('inf') else None
    except (ValueError,TypeError):return None

def parse_rows(rows,forced_year,label,stats=None):
    out=[]; headers=None; inspected=0; country_rows=0; matched=0; unmatched=set(); mean_field=None
    for row in rows:
        if not isinstance(row,dict):continue
        if headers is None:
            headers=list(row.keys())
            mean_field=find_radiance_field(row)
            if not mean_field:
                raise ValueError(f'{label}: No recognized mean-radiance column. Available columns: {headers}. Update field mappings against World Bank Data Description and Variables before importing.')
            if not has_field(row,COUNTRY_FIELDS) or not has_field(row,DISTRICT_FIELDS):
                raise ValueError(f'{label}: Expected ISO country and district name columns; got {headers}. A geographic crosswalk is required; never guess from district codes.')
        inspected+=1
        if inspected % 50000 == 0:
            print(f'{label}: scanned {inspected:,} global rows; {country_rows:,} Lebanon rows found...', flush=True)
        if not country_ok(row):continue
        country_rows+=1
        district=district_name(row)
        if not district:
            if field(row,DISTRICT_FIELDS):unmatched.add(str(field(row,DISTRICT_FIELDS)))
            continue
        period=period_for(row,forced_year)
        radiance=number(row.get(mean_field))
        if not period or radiance is None or radiance<0:continue
        quality=number(field(row,QUALITY_FIELDS))
        pixels=number(field(row,VALID_FIELDS))
        if quality is not None:
            if quality>1 and quality<=100:quality=quality/100
            if not 0<=quality<=1:quality=None
        if pixels is not None and (pixels<0 or int(pixels)!=pixels):pixels=None
        out.append({'district':district,'period':period,'radiance':radiance,'quality0Fraction':quality,
                    'validPixels':int(pixels) if pixels is not None else None,
                    '_sourceAdm1':str(field(row,['NAM_1','name_1']) or ''),
                    '_sourceAdm2':str(field(row,['NAM_2','name_2']) or ''),
                    '_sourceAdm1Code':str(field(row,['ADM1CD_c']) or ''),
                    '_sourceAdm2Code':str(field(row,['ADM2CD_c']) or '')})
        matched+=1
    if stats is not None:
        stats.update({'scanned':inspected,'lebanon':country_rows,'matched':matched})
    print(f'{label}: {inspected:,} source rows; {country_rows:,} Lebanon rows; {matched:,} usable district-month rows; radiance field={mean_field}')
    if unmatched: print(f' Unrecognized Lebanon district names: {", ".join(sorted(unmatched)[:35])}',file=sys.stderr)
    if not out:raise ValueError(f'{label}: No matchable Lebanon district monthly means. Inspect geographic IDs / source schema before publishing anything. Headers: {headers}')
    return out

class CountingRaw(io.RawIOBase):
    """Track bytes actually received, not just HTTP response headers."""
    def __init__(self, response):
        self.response = response
        self.bytes_read = 0
    def readable(self): return True
    def readinto(self, buf):
        chunk = self.response.read(len(buf))
        count = len(chunk)
        buf[:count] = chunk
        self.bytes_read += count
        return count

def csv_stream(url):
    req=urllib.request.Request(url,headers={'User-Agent':'TON618-University-Research/1.0 (CC BY 4.0 attribution)','Accept':'text/csv'})
    response=urllib.request.urlopen(req,timeout=90)
    counted = CountingRaw(response)
    text = io.TextIOWrapper(io.BufferedReader(counted),encoding='utf-8-sig',newline='')
    return response, csv.DictReader(text), counted

def check_global_download(filename, meter, stats):
    """Reject unexpectedly short yearly WORLD CSVs (not cached Lebanon extracts)."""
    size = meter.bytes_read
    count = stats.get('scanned',0)
    if size < MIN_GLOBAL_BYTES or count < MIN_GLOBAL_ROWS:
        raise ValueError(
            f'{filename}: Incomplete or unexpectedly short World Bank global CSV: '
            f'only {size/1_000_000:.1f} MB and {count:,} rows received. '
            'The official yearly resource is roughly 223 MB (2023 had 472,392 rows). '
            'This can happen if the server or connection ends the stream early. '
            'Try the download again, or download the full CSV from the World Bank '
            'catalog in a browser and import it with --input. The incomplete '
            'year was NOT cached or published.'
        )

def get_api_data(resource,year):
    """Try server-side country filtering. If unavailable, caller uses full CSV."""
    base=f'https://ddh-openapi.worldbank.org/resources/{resource}/data'
    req=urllib.request.Request(base+'?top=1',headers={'Accept':'application/json','User-Agent':'TON618-Research/1.0'})
    with urllib.request.urlopen(req,timeout=25) as rsp: obj=json.loads(rsp.read(300000))
    first=(obj.get('value') or obj.get('data') or [])
    if not first:raise ValueError('Data API returned no preview rows')
    preview=first[0]
    if not isinstance(preview,dict):raise ValueError('Data API response does not contain named columns')
    if not has_field(preview,COUNTRY_FIELDS) or not has_field(preview,DISTRICT_FIELDS):raise ValueError('Data API lacks required geographical columns')
    k=keymap(preview)
    country_column=next(k[clean(x)] for x in COUNTRY_FIELDS if clean(x) in k)
    result=[];offset=0
    while True:
        params=urllib.parse.urlencode({'top':2000,'skip':offset,'filter':f"{country_column} = 'LBN'"})
        with urllib.request.urlopen(urllib.request.Request(base+'?'+params,headers={'Accept':'application/json','User-Agent':'TON618-Research/1.0'}),timeout=45) as rsp:
            data=json.loads(rsp.read(8*1024*1024))
        batch=data.get('value') or data.get('data') or []
        if not batch:break
        result.extend(batch);offset+=len(batch)
        if offset>100000:raise ValueError('API returned unexpectedly many rows: country filter may not be supported')
        if len(batch)<2000:break
    if not result:raise ValueError('No records returned for LBN')
    return parse_rows(result,year,f'World Bank API {year}')

def extract_year(year,local=None,skip_api=False,cache_dir=None,force_download=False):
    resource,filename=RESOURCES.get(year,('',f'ntl_adm2_monthly_{year}.csv'))
    if local:
        with open(local,encoding='utf-8-sig',newline='') as f:
            return parse_rows(csv.DictReader(f),year,str(local))
    cache_file=Path(cache_dir)/f'worldbank_lebanon_adm2_{year}.csv' if cache_dir else None
    if cache_file and cache_file.is_file() and not force_download:
        print(f'Reusing saved Lebanon-only World Bank rows: {cache_file}',flush=True)
        return extract_year(year,local=cache_file)
    if resource and not skip_api:
        try:
            return get_api_data(resource,year)
        except Exception as exc:print(f'World Bank filtered API unavailable for {year} ({exc}); trying published yearly CSV.',file=sys.stderr)
    if not resource:raise ValueError(f'No verified download URL for {year}')
    url=f'https://datacatalogfiles.worldbank.org/ddh-published/0066940/{resource}/{filename}'
    print(f'Streaming {filename} (~223 MB global file, retaining only Lebanon rows)...',flush=True)
    response,rows,meter=csv_stream(url)
    stats={}
    try:
        if cache_file is None:
            try:
                result=parse_rows(rows,year,filename,stats=stats)
            except ValueError as error:
                check_global_download(filename,meter,stats)
                raise
            check_global_download(filename,meter,stats)
            return result
        cache_file.parent.mkdir(parents=True,exist_ok=True)
        tmp=cache_file.with_suffix('.tmp')
        try:
            with tmp.open('w',encoding='utf-8',newline='') as file:
                writer=csv.DictWriter(file,fieldnames=rows.fieldnames or [])
                writer.writeheader()
                def record_lebanon_rows():
                    for row in rows:
                        if country_ok(row):writer.writerow(row)
                        yield row
                try:
                    result=parse_rows(record_lebanon_rows(),year,filename,stats=stats)
                except ValueError:
                    check_global_download(filename,meter,stats)
                    raise
                # Cache only after the entire global file is accepted.
                check_global_download(filename,meter,stats)
            tmp.replace(cache_file)
            print(f'Saved Lebanon-only records to {cache_file} for future runs.',flush=True)
            return result
        except Exception:
            tmp.unlink(missing_ok=True)
            raise
    finally:
        response.close()

def build_output(entries,strict_duplicates=False):
    """Keep published observations only; exclude unresolved, conflicting source features.

    A World Bank ADM2 name may map to more than one distinct source polygon.
    Name matches alone do not prove same geographic coverage or justify
    averaging mean radiances. We intentionally exclude ambiguous district-months.
    """
    group=defaultdict(list)
    for e in entries:group[(e['district'],e['period'])].append(e)
    grouped=defaultdict(dict)
    exclusions=[]
    for (district,period),records in sorted(group.items()):
        # Exact repetition of the SAME source identity and measurement is harmless.
        unique=[]
        for e in records:
            if e not in unique:unique.append(e)
        if len(unique)!=1:
            details=[{'sourceDistrict':e.get('_sourceAdm2'),
                      'sourceGovernorate':e.get('_sourceAdm1'),
                      'sourceDistrictCode':e.get('_sourceAdm2Code'),
                      'sourceGovernorateCode':e.get('_sourceAdm1Code')}
                     for e in unique]
            exclusions.append({'district':district,'period':period,'sourceRecords':details,
                               'reason':'Multiple distinct World Bank source records map to the same district and month. No source geometry crosswalk verified.'})
            continue
        grouped[district][period]={k:unique[0][k] for k in ['district','period','radiance','quality0Fraction','validPixels']}
    if exclusions:
        by_district=defaultdict(list)
        for x in exclusions:by_district[x['district']].append(x)
        for district,problems in sorted(by_district.items()):
            ex=problems[0]['sourceRecords']
            print(f'WARNING: excluded {len(problems)} ambiguous district-month(s) for {district}. '
                  f'Source ADM2 identities for {problems[0]["period"]}: {ex}. '
                  'Source boundary crosswalk needed; no averaging or arbitrary selection.',file=sys.stderr,flush=True)
        if strict_duplicates:
            raise ValueError(f'Excluded {len(exclusions)} ambiguous district-months. Remove --strict-duplicates to import other districts.')
    districts=[{'district':n,'points':[grouped[n][p] for p in sorted(grouped[n])]} for n in NAMES if grouped[n]]
    if not districts:raise ValueError('No unambiguous district measurements remain; output not modified.')
    periods=sorted({p for d in districts for p in (x['period'] for x in d['points'])})
    return {
        'source':'World Bank Space2Stats — Monthly & Annual Black Marble Nighttime Lights',
        'sourceUrl':DATASET,'license':'CC BY 4.0','datasetId':'0066940',
        'periodStart':periods[0],'periodEnd':periods[-1],
        'statistic':'ntl_mean: mean NASA Black Marble nighttime-light radiance published by World Bank Space2Stats at ADM2 level',
        'qualityNote':'quality0Fraction is ntl_quality_prop_0_good, the published proportion of good-quality monthly observations. Reported mean may also include lower-quality or gap-filled observations; display QA alongside radiance. No extra QA mask is claimed or imputed.',
        'sourceYears':sorted({int(p[:4]) for p in periods}),
        'generatedAtUtc':datetime.now(timezone.utc).isoformat(),
        'excludedConflicts':exclusions,
        'districts':districts,
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--years',nargs='+',type=int,default=[2023,2024,2025]);parser.add_argument('--input',nargs='+',type=Path)
    parser.add_argument('--no-api',action='store_true',help='Stream published yearly CSVs rather than use World Bank filtered data API')
    parser.add_argument('--strict-duplicates',action='store_true',help='Fail instead of excluding ambiguous duplicate districts')
    parser.add_argument('--continue-on-error',action='store_true',help='Publish ONLY successfully imported years; record failed years explicitly (never fill missing observations)')
    parser.add_argument('--cache-dir',type=Path,default=Path(__file__).resolve().parents[1]/'.cache/worldbank',help='Cache original World Bank Lebanon-only records, for fast future reruns')
    parser.add_argument('--force-download',action='store_true',help='Refresh saved Lebanon-only records from source')
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'public/data/worldBankDistrictBlackMarble.json')
    args=parser.parse_args()
    if args.input:
        rows=[]
        for f in args.input:
            m=re.search(r'20\d{2}',f.name)
            rows+=extract_year(int(m.group()) if m else 2025,local=f)
    else:
        rows=[];failed_years=[]
        for y in args.years:
            if y not in RESOURCES:parser.error('Currently supported verified World Bank files: 2023, 2024, 2025')
            try:
                rows+=extract_year(y,skip_api=args.no_api,cache_dir=args.cache_dir,force_download=args.force_download)
            except Exception as exc:
                if not args.continue_on_error:raise
                print(f'WARNING: {y} NOT IMPORTED: {exc}',file=sys.stderr,flush=True)
                failed_years.append({'year':y,'reason':str(exc)[:1200]})
    result=build_output(rows,strict_duplicates=args.strict_duplicates)
    if not args.input and failed_years:
        result['failedYears']=[x['year'] for x in failed_years]
        result['importWarnings']=failed_years
        print(f'PARTIAL IMPORT: failed years {result["failedYears"]}; only successful years appear in the chart.',file=sys.stderr,flush=True)
    if result['excludedConflicts']:
        print(f'WARNING: {len(result["excludedConflicts"])} conflicting district-month rows excluded; see JSON metadata. These are NOT zero observations.',file=sys.stderr)
    if len(result['districts'])<26:
        print(f'WARNING: Only {len(result["districts"])} of 26 district names matched; data for other districts remains unavailable.',file=sys.stderr)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    temp=args.output.with_suffix('.tmp')
    temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temp.replace(args.output)
    print(f'Wrote {args.output}: {len(result["districts"])} districts, {len(rows)} records, {result["periodStart"]}–{result["periodEnd"]}.')

if __name__=='__main__':
    try: main()
    except Exception as exc:
        print('ERROR: '+str(exc),file=sys.stderr);sys.exit(1)
