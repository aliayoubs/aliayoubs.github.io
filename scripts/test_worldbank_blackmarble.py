"""Local logic tests only. Fake test inputs never ship as data."""
import importlib.util
import tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('wb',str(Path(__file__).with_name('sync_worldbank_blackmarble.py')))
wb=importlib.util.module_from_spec(spec);spec.loader.exec_module(wb)
assert len(wb.NAMES)==26
assert wb.ALIAS[wb.clean('Tyre')]=='Sour'
assert wb.ALIAS[wb.clean('Bint Jbeil')]=='Bent Jbeil'
assert wb.ALIAS[wb.clean('Marjayoun')]=='Marjaayoun'
# Real header names reported by the official 2023 global ADM2 CSV.
actual_header_fixture=[
 {'ISO_A3':'LBN','ADM1CD_c':'LB07','ADM2CD_c':'LB0702','NAM_0':'Lebanon','NAM_1':'Nabatieh','NAM_2':'Bent Jbeil','date':'2023-01-01','ntl_mean':'1.25','ntl_quality_prop_0_good':'0.83','ntl_quality_prop_1_poor':'0.12','ntl_quality_prop_2_gapfilled':'0.03','ntl_quality_prop_na':'0.02'},
 {'ISO_A3':'LBN','NAM_0':'Lebanon','NAM_1':'South','NAM_2':'Sour','date':'2023-01-01','ntl_mean':'4.50','ntl_quality_prop_0_good':'0.95'},
 {'ISO_A3':'FRA','NAM_0':'France','NAM_1':'Paris','NAM_2':'Paris','date':'2023-01-01','ntl_mean':'20.0','ntl_quality_prop_0_good':'1.0'},
]
parsed=wb.parse_rows(actual_header_fixture,2023,'2023 real-header fixture')
assert len(parsed)==2, parsed
assert parsed[0]['district']=='Bent Jbeil'
assert parsed[0]['period']=='2023-01'
assert parsed[0]['quality0Fraction']==.83
assert parsed[0]['radiance']==1.25
assert parsed[1]['district']=='Sour'
rows=[
 {'iso3':'LBN','ADM2_NAME':'Bint Jbeil','year':'2023','month':'9','ntl_mean':'1.0','prop_quality_0':'.9'},
 {'iso3':'LBN','ADM2_NAME':'Bint Jbeil','year':'2025','month':'9','ntl_mean':'0.5','prop_quality_0':'.8'},
 {'iso3':'LBN','ADM2_NAME':'Tyre','year':'2025','month':'9','ntl_mean':'2.25','prop_quality_0':'.7'},
 {'iso3':'FRA','ADM2_NAME':'Paris','year':'2025','month':'9','ntl_mean':'5.0','prop_quality_0':'1'},
]
records=wb.parse_rows(rows,2025,'local fixture')
assert len(records)==3
assert records[0]['district']=='Bent Jbeil'
assert records[2]['district']=='Sour'
assert records[0]['quality0Fraction']==.9
out=wb.build_output(records)
assert len(out['districts'])==2
assert out['periodStart']=='2023-09'
assert out['periodEnd']=='2025-09'
assert next(d for d in out['districts'] if d['district']=='Bent Jbeil')['points'][1]['radiance']==.5
try:
 wb.parse_rows([{'iso3':'LBN','district':'Bent Jbeil','date':'2025-09','unlabeled':'200'}],2025,'bad fixture')
 raise AssertionError('Unrecognized radiance column was accepted')
except ValueError: pass
print('OK: official ISO_A3/NAM_2 schema, Lebanon selection, district aliases, monthly periods, ntl_quality_prop_0_good, QA, duplicates and safety checks')
# Confirm every previously unrecognized World Bank name has an explicit verified alias.
for source,expected in {
 'Bint Jubail':'Bent Jbeil','El Metn':'El Meten','Hasbaiya':'Hasbaya',
 'Jubail':'Jbeil','Kasrouane':'Kesrwane','Minieh-Danieh':'El Minieh-Dennie',
 'Nabatiye':'El Nabatieh','Rachiaya':'Rachaya',
}.items():
 assert wb.ALIAS[wb.clean(source)]==expected,(source,expected)
# A real source can hold multiple ADMIN2 records with a shared label. We must
# not average their NTL means or arbitrarily pick the first one.
collision=[
 {'ISO_A3':'LBN','NAM_1':'Akkar','NAM_2':'Akkar','ADM2CD_c':'AA01','date':'2023-01-01','ntl_mean':'2.4','ntl_quality_prop_0_good':'0.8'},
 {'ISO_A3':'LBN','NAM_1':'North','NAM_2':'Akkar','ADM2CD_c':'NN99','date':'2023-01-01','ntl_mean':'5.1','ntl_quality_prop_0_good':'0.7'},
 {'ISO_A3':'LBN','NAM_1':'Nabatieh','NAM_2':'Bint Jubail','ADM2CD_c':'BB01','date':'2023-01-01','ntl_mean':'1.2','ntl_quality_prop_0_good':'0.9'},
]
parsed=wb.parse_rows(collision,2023,'collision fixture')
output=wb.build_output(parsed)
assert len(output['districts'])==1
assert output['districts'][0]['district']=='Bent Jbeil'
assert output['excludedConflicts'][0]['district']=='Akkar'
assert output['excludedConflicts'][0]['sourceRecords'][0]['sourceDistrictCode']=='AA01'
assert output['excludedConflicts'][0]['sourceRecords'][1]['sourceDistrictCode']=='NN99'
assert all(not any(k.startswith('_') for k in p) for d in output['districts'] for p in d['points'])
try:
 wb.build_output(parsed,strict_duplicates=True)
 raise AssertionError('Strict duplicate error not raised')
except ValueError:pass
print('OK: eight source district spellings and conflicting ADM2 identities (no arbitrary averaging, full provenance)')
# Regression: 2023-10, 2023-11 and 2023-12 must NOT parse as 2023-01.
for month in range(1,13):
    for date in (f'2023-{month:02d}', f'2023-{month:02d}-01', f'2023/{month:02d}/01'):
        assert wb.period_for({'date':date},2023)==f'2023-{month:02d}',date
print('OK: all 12 months, including Oct-Dec, retain correct month numbers')

# Regression: count the bytes actually received from a data stream.
import csv as _csv
import io as _io
import sys
import json
from unittest import mock as _mock
sample_bytes=b'ISO_A3,NAM_2,date,ntl_mean\nFRA,Paris,2024-01,5.0\n'
counted=wb.CountingRaw(_io.BytesIO(sample_bytes))
with _io.TextIOWrapper(_io.BufferedReader(counted),encoding='utf-8') as stream:
    assert len(list(_csv.DictReader(stream)))==1
assert counted.bytes_read==len(sample_bytes)

# Upstream/CDN short responses must not be cached as complete World Bank files.
with tempfile.TemporaryDirectory() as tmp:
    fake_resp=_io.BytesIO(sample_bytes)
    fake_rows=_csv.DictReader(_io.StringIO(sample_bytes.decode()))
    fake_meter=type('Meter',(),{'bytes_read':len(sample_bytes)})()
    with _mock.patch.object(wb,'csv_stream',return_value=(fake_resp,fake_rows,fake_meter)):
        try:
            wb.extract_year(2024,skip_api=True,cache_dir=Path(tmp))
            raise AssertionError('Short World Bank response was accepted')
        except ValueError as exc:
            assert 'Incomplete or unexpectedly short' in str(exc),exc
    assert not (Path(tmp)/'worldbank_lebanon_adm2_2024.csv').exists()
    assert not (Path(tmp)/'worldbank_lebanon_adm2_2024.tmp').exists()

# Opt-in partial imports preserve successful 2023 and record failed 2024 explicitly.
with tempfile.TemporaryDirectory() as tmp:
    output=Path(tmp)/'radiance.json'
    one_2023=wb.parse_rows([{'ISO_A3':'LBN','NAM_2':'Akkar','date':'2023-01-01','ntl_mean':'1.5'}],2023,'one 2023')
    def fake_year(year,**kwargs):
        if year==2024:raise ValueError('Simulated truncated download')
        return one_2023
    old_argv=sys.argv
    try:
        sys.argv=['importer','--years','2023','2024','--no-api','--continue-on-error','--output',str(output)]
        with _mock.patch.object(wb,'extract_year',side_effect=fake_year):
            wb.main()
    finally:
        sys.argv=old_argv
    result=json.loads(output.read_text(encoding='utf-8'))
    assert result['sourceYears']==[2023]
    assert result['failedYears']==[2024]
    assert len(result['districts'])==1
print('OK: truncated 2024 stream is rejected, cached data is protected, partial import declares missing years')
