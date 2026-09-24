import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard';

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});

describe('copyToClipboard', () => {
  it('uses navigator.clipboard when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await expect(copyToClipboard('GABC123')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('GABC123');
  });

  it('falls back to execCommand when the Clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const exec = vi.fn().mockReturnValue(true);
    document.execCommand = exec;

    await expect(copyToClipboard('gate-code')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('falls back to execCommand when the Clipboard API is missing', async () => {
    const exec = vi.fn().mockReturnValue(true);
    document.execCommand = exec;

    await expect(copyToClipboard('x')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('returns false when every strategy fails', async () => {
    document.execCommand = vi.fn(() => {
      throw new Error('unsupported');
    });

    await expect(copyToClipboard('x')).resolves.toBe(false);
  });
});
