import zlib
import sys

text = sys.stdin.read()
if text[:2] == '0x':
    text = text[2:]

data = bytes.fromhex(text)

# wbits=15: zlib header (default)
# wbits=16+15: gzip header
# wbits=-15: no header

compress_obj = zlib.compressobj(wbits=-15)
compressed_data = [
    compress_obj.compress(data),
    compress_obj.flush(),
]
for chunk in compressed_data:
    print('(' + chunk.hex() + ')')

encoded_text = b''.join(compressed_data).hex()

print(encoded_text)
