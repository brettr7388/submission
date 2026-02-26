import * as fs from 'fs';
import * as path from 'path';
import { countFrames } from '../src/services/mp3Parser';

const samplePath = path.join(__dirname, '..', 'sample.mp3');

describe('countFrames', () => {
  const buffer = fs.readFileSync(samplePath);

  it('should return 6089 for the sample MP3', () => {
    expect(countFrames(buffer)).toBe(6089);
  });

  it('should return 0 for an empty buffer', () => {
    expect(countFrames(Buffer.alloc(0))).toBe(0);
  });

  it('should return 0 for non Mp3 data', () => {
    expect(countFrames(Buffer.from('this is not an mp3 file'))).toBe(0);
  });

  it('should return 0 for a buffer too short for a frame header', () => {
    expect(countFrames(Buffer.from([0xff, 0xfb]))).toBe(0);
  });

  it('should handle files with ID3v2 tags', () => {
    //the sample file has an ID3 tag
    //verifiy it still counts correctly
    expect(buffer[0]).toBe(0x49); //'I'
    expect(buffer[1]).toBe(0x44); // 'D'
    expect(buffer[2]).toBe(0x33); // '3'
    expect(countFrames(buffer)).toBe(6089);
  });
});
