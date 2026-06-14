#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <input_file> [output_file]"
  echo "Example: $0 EER"
  echo "Example: $0 EER EER_final"
  exit 1
fi

#Strip '.mmd' extension 
input_base="${1%.mmd}"

#Use the second argument for the output name, or default to the input name
output_base="${2:-$input_base}"

#Check if the input file actually exists before trying to render it
if [ ! -f "${input_base}.mmd" ]; then
  echo "Error: Cannot find file '${input_base}.mmd'."
  exit 1
fi

echo "Rendering ${input_base}.mmd -> ${output_base}.svg..."

PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
mmdc -i "${input_base}.mmd" -o "${output_base}.svg" 

if [ $? -eq 0 ]; then
  echo "Success!"
else
  echo "Error generating diagram."
  exit 1
fi
