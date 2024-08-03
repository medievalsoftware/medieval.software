#!/bin/bash

n=1
while IFS= read -r url; do
    curl -o "${n}.png" "$url"
    ((n++))
done < urls.txt
