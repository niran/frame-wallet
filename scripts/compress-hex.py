import zlib
import sys

text = sys.stdin.read()
if text[:2] == '0x':
    text = text[2:]

data = bytes.fromhex(text)
compressed_data = zlib.compress(data)
encoded_text = compressed_data.hex()

print(encoded_text)
