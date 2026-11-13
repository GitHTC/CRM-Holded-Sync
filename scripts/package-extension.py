import os
import shutil
import zipfile
import re
from urllib.parse import urlparse

def inject_deployment_config(ext_dir):
    """Sustituye los placeholders por la URL del gateway y el OAuth client ID."""
    gateway = os.environ.get('GATEWAY_URL', '').rstrip('/')
    client_id = os.environ.get('OAUTH_CLIENT_ID', '').replace('.apps.googleusercontent.com', '')
    if not gateway or not client_id:
        print("WARNING: define GATEWAY_URL y OAUTH_CLIENT_ID antes de compilar; "
              "el paquete NO funcionará con los placeholders actuales.")
        return
    if urlparse(gateway).scheme != 'https':
        raise SystemExit("GATEWAY_URL debe ser https://")
    host = urlparse(gateway).netloc
    for name in ('manifest.json', 'config.js'):
        path = os.path.join(ext_dir, name)
        txt = open(path, encoding='utf-8').read()
        txt = txt.replace('https://REPLACE_GATEWAY_URL', gateway).replace('REPLACE_GATEWAY_URL', host)
        txt = txt.replace('REPLACE_OAUTH_CLIENT_ID', client_id)
        open(path, 'w', encoding='utf-8').write(txt)


def package_extension():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(root_dir, 'dist')
    ext_dir = os.path.join(root_dir, 'extension')
    zip_path = os.path.join(root_dir, 'segurnube-holded-sync-v3.0.0.zip')

    if not os.path.exists(dist_dir):
        print("dist directory does not exist. Run build first.")
        return

    # Clean and re-create extension dir
    if os.path.exists(ext_dir):
        shutil.rmtree(ext_dir)
    os.makedirs(ext_dir, exist_ok=True)

    # Copy files needed for Chrome extension (exclude backend files server.cjs, etc.)
    files_to_copy = ['manifest.json', 'background.js', 'content.js', 'config.js', 'index.html']
    for f in files_to_copy:
        src = os.path.join(dist_dir, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(ext_dir, f))
        else:
            print(f"Warning: {src} not found in dist")

    # Icons
    icons_src = os.path.join(dist_dir, 'icons')
    if os.path.exists(icons_src):
        shutil.copytree(icons_src, os.path.join(ext_dir, 'icons'))

    inject_deployment_config(ext_dir)

    assets_src = os.path.join(dist_dir, 'assets')
    if os.path.exists(assets_src):
        shutil.copytree(assets_src, os.path.join(ext_dir, 'assets'))

    # Create zip file with manifest.json at root level
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ext_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, ext_dir)
                zipf.write(file_path, arcname)

    print(f"Extension successfully packaged into {ext_dir} and {zip_path}")

if __name__ == '__main__':
    package_extension()
