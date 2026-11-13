import os
import shutil
import zipfile

def package_extension():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(root_dir, 'dist')
    ext_dir = os.path.join(root_dir, 'extension')
    zip_path = os.path.join(root_dir, 'holded-sync-v2.0.0.zip')

    if not os.path.exists(dist_dir):
        print("dist directory does not exist. Run build first.")
        return

    # Clean and re-create extension dir
    if os.path.exists(ext_dir):
        shutil.rmtree(ext_dir)
    os.makedirs(ext_dir, exist_ok=True)

    # Copy files needed for Chrome extension (exclude backend files server.cjs, etc.)
    files_to_copy = ['manifest.json', 'background.js', 'content.js', 'index.html']
    for f in files_to_copy:
        src = os.path.join(dist_dir, f)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(ext_dir, f))
        else:
            print(f"Warning: {src} not found in dist")

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
