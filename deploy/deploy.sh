#!/bin/bash
set -e

cd /home/dane/medieval.software

git pull origin main
make build
sudo systemctl restart site

echo "deploy complete"
