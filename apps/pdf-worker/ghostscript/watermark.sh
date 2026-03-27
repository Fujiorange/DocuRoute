#!/bin/bash
# Ghostscript-based PDF watermarking script
# Args: $1=input.pdf $2=output.pdf $3=qr.png $4=revisionCode

set -e

INPUT_PDF="$1"
OUTPUT_PDF="$2"
QR_PNG="$3"
REVISION_CODE="$4"

if [ -z "$INPUT_PDF" ] || [ -z "$OUTPUT_PDF" ] || [ -z "$QR_PNG" ]; then
    echo "Usage: $0 <input.pdf> <output.pdf> <qr.png> <revisionCode>"
    exit 1
fi

# Create a PostScript file for watermark overlay
WATERMARK_PS=$(mktemp /tmp/watermark.XXXXXX.ps)

cat > "$WATERMARK_PS" <<'EOF'
%!PS
% Watermark overlay - "SUPERSEDED" text with rotation
/Helvetica-Bold findfont 48 scalefont setfont
0.8 0 0 setrgbcolor  % Red color
0.2 setalpha         % 20% opacity

% Get page dimensions
currentpagedevice /PageSize get
aload pop /pageheight exch def /pagewidth exch def

% Tile watermark text across page
-200 150 pageheight {
    /y exch def
    -200 150 pagewidth {
        /x exch def
        gsave
        x y translate
        45 rotate
        0 0 moveto
        (SUPERSEDED) show
        grestore
    } for
} for

% Add QR code in bottom-right corner
% Note: QR code will be embedded separately using pdfmark
% This placeholder ensures Ghostscript processes the page correctly

showpage
EOF

# Use Ghostscript to overlay watermark
# -dBATCH: Exit after processing
# -dNOPAUSE: Don't prompt between pages
# -sDEVICE=pdfwrite: Output PDF
# -dCompatibilityLevel=1.4: PDF version
gs -dBATCH -dNOPAUSE -dNOSAFER \
   -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -sOutputFile="$OUTPUT_PDF" \
   "$WATERMARK_PS" \
   "$INPUT_PDF"

# Clean up
rm -f "$WATERMARK_PS"

# Note: QR code embedding is handled by the Go handler using pdf-lib or similar
# Ghostscript doesn't easily support image overlays with precise positioning
# The Go handler should post-process the output to add the QR code

echo "Watermark applied successfully"
