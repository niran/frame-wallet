import zlib
import sys

text = sys.stdin.read()
if text[:2] == '0x':
    text = text[2:]

data = bytes.fromhex(text)

decompress_obj = zlib.decompressobj(wbits=-15)
decompressed_data = [
    decompress_obj.decompress(data),
    decompress_obj.flush(),
]
for chunk in decompressed_data:
    print('(' + chunk.hex() + ')')

encoded_text = b''.join(decompressed_data).hex()

print(encoded_text)
