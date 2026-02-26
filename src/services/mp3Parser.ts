//http://www.mp3-tech.org/programmer/frame_header.html

//MPEG1 layer 3 bitrates in kbps (indicates 0x0 and 0xF are invalid)
//Bitrate lookup table in kilobits per second
//hexadecimal base-16
const BITRATES: Record<number, number> = {
    0x1: 32, 0x2: 40, 0x3: 48, 0x4: 56,
    0x5: 64, 0x6: 80, 0x7:96, 0x8:112,
    0x9: 128, 0xa: 160, 0xb:192, 0xc:224,
    0xd: 256, 0xe:320,
};

//MPEG1 sample rates in hertz (index 0x3 reserved)
//sample rate lookup table
//2 bit
const SAMPLE_RATES: Record<number, number> = {
    0x0: 44100,
    0x1: 48000,
    0x2: 32000,

};

// parsing a frame header returns frameSize and channelMode
interface FrameHeader {
    frameSize: number;  //how many bytes this frame occupies
    channelMode: number; //how audio channels are arranged 

}

//mp3 frame headers are 4 bytes (32 bits)
//Header bit layout: AAAAAAAA AAABBCCD EEEEFFGH IIJJKLMM

//   A = sync (11 bits), B = version(2 bits), C = layer(2 bits), D = protection(1 bit)
//   E = bitrate(4 bits), F = sampleRate(2 bits), G = padding(1 bit), H = private(1 bit), I = channelMode(2 bits)


//takes a buffer(part of raw binary file) and an offset(where to start reading) and tries to parse a valid MP3 frame header
//if it cant returns null
function parseFrameHeader(buffer: Buffer, offset:number): FrameHeader | null {
    //if not 4 bytes left then end
    if (offset + 4 > buffer.length) return null;

    //read 4 bytes starting at offset as a single unsigned 32 bit big-endian int
    //now header has all 32 bits as one number to extract fields
    const header = buffer.readUInt32BE(offset);

    //sync word check - top 11 bits must all be 1
    if (((header & 0xffe00000) >>> 0) !== 0xffe00000)
        return null;

    //MPEG version must be MPEG1 (0x3)
    //shift right 19 bits then mask with 0x3(binary 11)
    //0x3 = MPEG1
    if (((header >> 19) & 0x3) !== 0x3)
        return null;

    //layer must be Layer 3 (stored as 0x1)
    if (((header >> 17) & 0x3) !== 0x1)
        return null;

    //extract 4 bit bitrate index (bits E))
    const bitrateIndex = (header >> 12) & 0xf;
    const bitrate = BITRATES[bitrateIndex];
    if (!bitrate)
        return null;
    //(bits F)
    const sampleRateIndex = (header >> 10) & 0x3;
    const sampleRate = SAMPLE_RATES[sampleRateIndex];
    if(!sampleRate)
        return null;

    //extract 1 bit padding (bit G) and 2 bit channel mode (bits I)
    const padding = (header >> 9 ) & 0x1;
    const channelMode = (header >> 6) & 0x3;

    //standard MPEG1 Layer 3 frame size formula
    const frameSize = Math.floor((144 * (bitrate*1000)) / sampleRate) + padding;

    return { frameSize, channelMode};
}

//skip past ID3v2 tag if present at the start of the file
// tagsize uses "synchsafe" encoding - 7 bits per byte to avoid false sync words
function getAudioStartOffset(buffer: Buffer): number{
    if(
        buffer.length >= 10 &&
        buffer[0] === 0x49 && //'I'
        buffer[1] === 0x44 && // 'D'
        buffer[2] === 0x33      //'3'
    )
    {
        const size =
        ((buffer[6] & 0x7f) << 21) |
        ((buffer[7] & 0x7f) << 14) |
        ((buffer[8] & 0x7f) << 7) |
        (buffer[9] & 0x7f);

        //audio starts here
        return 10 + size;
    }
    //if no ID3 tag audio starts at byte 0
    return 0;
}

//check if this frame is a Xing/Info metadata frame (variable bitrate header, not actual audio)
function isXingFrame(buffer: Buffer, frameOffset: number, channelMode: number):boolean {
    
    //side info size differs: mono = 17 bytes, else = 32 bytes
    const sideInfoSize = channelMode === 3 ? 17 : 32;
    //xing/info tag sits right after the header + side info
    const xingOffset = frameOffset + 4 + sideInfoSize;

    //see if we have enough data to read
    if(xingOffset + 4 > buffer.length)
        return false;

    //reads 4 bytes as ASCII text
    //if Xing or Info its metadata
    const tag = buffer.subarray(xingOffset, xingOffset + 4).toString('ascii');
    return tag === 'Xing' || tag === 'Info';
}

//takes mp3 file as a buffer and returns the number of audio frames
// offset starts past the ID3 tag
//frameCount tracks how many valid frames are found
//isFirstFrame tracks whether we are still on the first frame (Xing)
export function countFrames(buffer: Buffer): number {
    let offset = getAudioStartOffset(buffer);
    let frameCount = 0;
    let isFirstFrame = true;

    //loop through file
    //needs atleast 4 bytes for a header
    while (offset< buffer.length -4){
        const header = parseFrameHeader(buffer, offset);

        //if we get a valid header check if its Xing/Info
        if(header && header.frameSize >0) {
            //skip Xing/Info frame - metadata not audio content
            if(isFirstFrame && isXingFrame(buffer, offset, header.channelMode)) {
                offset += header.frameSize;
                isFirstFrame = false;
                continue;
            }

            //if not Xing/Info then increment the count
            //flag we passed the the first frame
            //continue by frameSize bytes to start next frame
            frameCount++;
            isFirstFrame = false;
            offset += header.frameSize;
        }

        //if parseFrameHeader returned null
        //no valid header so we just move forward by 1 byte
        //garbage collecting
        else {
            offset++;
        }
    }

    //returns total number of audio frames found
    return frameCount;
}