#MP3 Frame Counter API


API endpoint that accepts an MP3 file and returns the number of MPEG1 Layer 3 frames.

## Setup
```bash
npm install
```

## Requirements

- Node 18+ (tested with Node 20)
- Use ESLint 8.x — v9+ ignores `.eslintrc.json`. If lint fails, run: `npm install -D eslint@8`



## Run
```bash
npm run dev
```

Server starts at http://localhost:3000

## Test the Endpoint
```bash
curl -X POST -F "file=@sample.mp3" http://localhost:3000/file-upload
```

Returns:
```json
{ "frameCount": 6089 }
```

You can also visit http://localhost:3000 for a simple upload UI.

## Run Tests
```bash
npm test
```

## Lint & Format
```bash
npm run lint
npm run format
```

## How It Works

The parser reads through the MP3 binary data frame by frame. Each frame starts with a 4-byte header containing a sync word (11 set bits), followed by version, layer, bitrate, and sample rate info. I used http://www.mp3-tech.org/programmer/frame_header.html as my primary reference.

Key steps:
- Skip the ID3v2 metadata tag at the start of the file (uses synchsafe integer encoding for its size)
- Find frame headers by checking for the 11-bit sync word
- Validate that each header is MPEG1 Layer 3, then calculate frame size using `floor(144 * bitrate / sampleRate) + padding`
- Skip the Xing/Info metadata frame if present (VBR header — valid MPEG frame structurally but not audio)
- Jump frame-by-frame until end of file

Result verified against `mediainfo --fullscan sample.mp3` which also reports 6089 frames for the sample audio given to me.

## Possible Improvements

- For very large files, a streaming approach using Node.js Transform streams would keep memory usage constant instead of loading the whole file into a buffer
- ID3v1 tags at the end of the file (128 bytes) could produce false positive frame detections
- The Xing header actually contains a precalculated frame count that could be used as a fast path