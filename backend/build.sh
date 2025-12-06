#!/bin/bash
set -e

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Verifying scraperapi-sdk installation..."
python -c "import scraperapi_sdk; print('✓ scraperapi-sdk installed successfully')" || {
    echo "scraperapi-sdk not found, installing again..."
    pip uninstall scraperapi-sdk -y
    pip install scraperapi-sdk
    python -c "import scraperapi_sdk; print('✓ scraperapi-sdk installed successfully')"
}

echo "Build complete!"
