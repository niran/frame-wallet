import zlib
import sys

text = sys.stdin.read()
if text[:2] == '0x':
    text = text[2:]

data = bytes.fromhex(text)
decompressed_data = zlib.decompress(data)
encoded_text = decompressed_data.hex()

print(encoded_text)
