import request from 'supertest';
import path from 'path';
import { app } from '../src/server';

const samplePath = path.join(__dirname, '..', 'sample.mp3');

describe('POST /file-upload', () => {
  it('should return the correct frame count for the sample MP3', async () => {
    const response = await request(app).post('/file-upload').attach('file', samplePath);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({ frameCount: 6089 });
  });
  it('should return 400 when no file is upload', async () => {
    const response = await request(app).post('/file-upload');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return an error for non-Mp3 files', async () => {
    const response = await request(app)
      .post('/file-upload')
      .attach('file', Buffer.from('not an mp3'), 'test.txt');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /health', () => {
  it('should return status ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
