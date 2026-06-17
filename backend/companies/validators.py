import re


def normalize_partita_iva(value: str) -> str:
    return re.sub(r"\s", "", str(value or "")).upper()


def normalize_codice_fiscale(value: str) -> str:
    return re.sub(r"\s", "", str(value or "")).upper()


def validate_partita_iva(value: str) -> str:
    cleaned = normalize_partita_iva(value)
    if not cleaned:
        return ""
    if not re.fullmatch(r"\d{11}", cleaned):
        raise ValueError("La partita IVA deve contenere 11 cifre.")
    digits = [int(char) for char in cleaned]
    checksum = 0
    for index, digit in enumerate(digits[:10]):
        if index % 2 == 0:
            checksum += digit
        else:
            doubled = digit * 2
            checksum += doubled // 10 + doubled % 10
    control = (10 - (checksum % 10)) % 10
    if control != digits[10]:
        raise ValueError("Partita IVA non valida (cifra di controllo errata).")
    return cleaned


def validate_codice_fiscale(value: str) -> str:
    cleaned = normalize_codice_fiscale(value)
    if not cleaned:
        return ""
    if re.fullmatch(r"\d{11}", cleaned):
        return validate_partita_iva(cleaned)
    if not re.fullmatch(r"^[A-Z0-9]{16}$", cleaned):
        raise ValueError(
            "Il codice fiscale deve essere di 16 caratteri alfanumerici o 11 cifre."
        )
    return cleaned
