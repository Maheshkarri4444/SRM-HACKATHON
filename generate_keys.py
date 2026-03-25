from pqcrypto.kem import ml_kem_512
import base64

public_key, secret_key = ml_kem_512.generate_keypair()

pub_b64 = base64.b64encode(public_key).decode()
sec_b64 = base64.b64encode(secret_key).decode()

print("PUBLIC_KEY=", pub_b64)
print("SECRET_KEY=", sec_b64)