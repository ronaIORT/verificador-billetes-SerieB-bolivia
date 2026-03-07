#!/bin/bash

echo "Generando nueva version..."

# Obtener fecha y hora
version=$(date +"%Y.%m.%d-%H.%M")
buildDate=$(date -u +"%Y-%m-%dT%H:%M:00.000Z")

echo "Version: $version"

# Actualizar version.json
cat > version.json << EOF
{
  "version": "$version",
  "buildDate": "$buildDate"
}
EOF

# Actualizar CACHE_NAME en sw.js
sed -i "s/const CACHE_NAME = 'verificador-billetes-[^']*';/const CACHE_NAME = 'verificador-billetes-$version';/" sw.js

echo ""
echo "Version actualizada correctamente!"
echo "CACHE_NAME: verificador-billetes-$version"
