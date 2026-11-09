#!/usr/bin/env python3
"""Create a DISPLAY-ONLY WGS84 PNG plus manifest entry from an authorized
CBAS SDGSAT-1 Glimmer Level-4 GeoTIFF. Requires: pip install rasterio pillow numpy.
Use only under your CBAS data agreement. DOES NOT CALIBRATE radiance.
"""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--input', required=True, help='Approved L4A/L4B GIU GeoTIFF (not a browse screenshot)')
    ap.add_argument('--product-id', required=True, help='Official ID e.g. KX10_GIU_20260115_E35.50_N33.40_XXXXXXXX_L4A')
    ap.add_argument('--date', required=True, help='Actual acquisition date YYYY-MM-DD from CBAS metadata')
    ap.add_argument('--band', choices=['P','RGB'], required=True, help='P=10 m nominal sensor; RGB=40 m')
    ap.add_argument('--output', default='public/data/sdgsat1', help='Vite public scene directory')
    ap.add_argument('--max-pixels', type=int, default=3000, help='Longest displayed image dimension')
    ap.add_argument('--allow-publish', action='store_true', help='Confirm CBAS agreement permits the intended preview display / distribution')
    args=ap.parse_args()
    if not args.allow_publish:
        ap.error('You must confirm that your CBAS user agreement allows these previews to be displayed/shared: add --allow-publish only when authorized.')
    from datetime import date as dt_date
    try:
        dt_date.fromisoformat(args.date)
    except ValueError:
        ap.error('Invalid ISO date')
    product_id=args.product_id.strip()
    if not re.fullmatch(r'KX10_GIU_\d{8}_[a-zA-Z0-9_.-]+', product_id) or not product_id.startswith('KX10_GIU_'+args.date.replace('-','')+'_'):
        ap.error('Official Glimmer product ID must match the acquisition date and start with KX10_GIU_YYYYMMDD_')
    if args.max_pixels<500 or args.max_pixels>8000:
        ap.error('--max-pixels must be between 500 and 8000')
    import numpy as np
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.warp import calculate_default_transform, reproject, transform_bounds
    from PIL import Image
    src_path=Path(args.input)
    if not src_path.is_file():
        ap.error('Input file does not exist')
    outdir=Path(args.output)
    outdir.mkdir(parents=True, exist_ok=True)
    safe_id=re.sub(r'[^a-zA-Z0-9_-]','_',product_id)[:110]
    band=args.band
    with rasterio.open(src_path) as src:
        if not src.crs:
            ap.error('GeoTIFF has no CRS; supply a fully georeferenced Level-4 product.')
        if band=='RGB' and src.count<3:
            ap.error('RGB mode requires a three-band source GeoTIFF.')
        left,bottom,right,top=transform_bounds(src.crs,'EPSG:4326',*src.bounds,densify_pts=25)
        if not (-180<=left<right<=180 and -90<=bottom<top<=90):
            ap.error('Invalid geographic scene bounds')
        if right<34.8 or left>36.73 or top<32.9 or bottom>34.78:
            ap.error('Scene does not cover any part of Lebanon')
        trans,w,h=calculate_default_transform(src.crs,'EPSG:4326',src.width,src.height,*src.bounds)
        factor=min(1.,args.max_pixels/max(w,h))
        w=max(1,int(w*factor));h=max(1,int(h*factor))
        from rasterio.transform import from_bounds
        trans=from_bounds(left,bottom,right,top,w,h)
        indices=[1] if band=='P' else [1,2,3]
        layers=[];joint_valid=None
        for idx in indices:
            dest=np.zeros((h,w),dtype='float32')
            reproject(
                source=rasterio.band(src,idx),destination=dest,
                src_transform=src.transform,src_crs=src.crs,
                dst_transform=trans,dst_crs='EPSG:4326',
                src_nodata=src.nodata,dst_nodata=np.nan,
                resampling=Resampling.bilinear
            )
            valid=np.isfinite(dest)
            if src.nodata is None:valid &= (dest!=0)
            joint_valid=valid if joint_valid is None else (joint_valid & valid)
            layers.append(dest)
        assert joint_valid is not None
        if joint_valid.sum()<30:
            ap.error('Too few valid pixels; check band selection and nodata values')
        color=[]
        for arr in layers:
            vals=arr[joint_valid]
            lo,hi=np.percentile(vals,[0.5,99.8])
            if hi<=lo:hi=lo+1
            # PNG is for visual display only; this contrast stretch destroys
            # absolute radiometry. Keep original products for any analysis.
            pixels=np.clip((arr-lo)/(hi-lo),0,1)
            color.append(np.uint8(np.power(pixels,0.8)*255))
        rgb=np.stack(color*3 if band=='P' else color,axis=-1)
        alpha=(joint_valid.astype('uint8')*255)
        rgba=np.concatenate([rgb,alpha[:,:,None]],axis=-1)
        target=outdir/(safe_id+'.png')
        Image.fromarray(rgba,'RGBA').save(target,optimize=True)
    manifest_path=outdir/'manifest.json'
    if manifest_path.exists():
        contents=json.loads(manifest_path.read_text(encoding='utf-8'))
        if contents.get('schema_version')!='1.0' or not isinstance(contents.get('scenes'),list):
            ap.error('Existing manifest is not schema_version 1.0')
    else:
        contents={'schema_version':'1.0','scenes':[]}
    scene={
        'id':safe_id,'product_id':product_id,'acquisition_date':args.date,
        'band':band,'resolution_m':10 if band=='P' else 40,
        'bbox':[round(left,9),round(bottom,9),round(right,9),round(top,9)],
        'filename':target.name,'processing_level':'L4B' if product_id.endswith('_L4B') else 'L4A',
        'projection':'EPSG:4326'
    }
    contents['scenes']=[s for s in contents['scenes'] if s.get('id')!=safe_id]+[scene]
    contents['scenes'].sort(key=lambda s:s['acquisition_date'])
    manifest_path.write_text(json.dumps(contents,indent=2)+'\n',encoding='utf-8')
    print('Prepared display-only preview:',target)
    print('Updated:',manifest_path)
    print('Aligned WGS84 bounds:',scene['bbox'])
    print('WARNING: This PNG has an arbitrary visualization stretch. It is NOT a radiance measurement.')
    print('WARNING: Confirm your CBAS data agreement permits publication or redistribution of these previews.')

if __name__=='__main__':
    main()
