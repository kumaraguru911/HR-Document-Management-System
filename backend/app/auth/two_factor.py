import pyotp


ISSUER_NAME = "HR Document Management"


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def generate_provisioning_uri(
    secret: str,
    email: str
) -> str:

    totp = pyotp.TOTP(secret)

    return totp.provisioning_uri(
        name=email,
        issuer_name=ISSUER_NAME
    )


def verify_totp(
    secret: str,
    otp: str
) -> bool:

    totp = pyotp.TOTP(secret)

    return totp.verify(
        otp,
        valid_window=1
    )