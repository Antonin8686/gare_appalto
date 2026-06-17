import re

from rest_framework import serializers

from .models import Company
from .validators import validate_codice_fiscale, validate_partita_iva


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = (
            "id",
            "name",
            "partita_iva",
            "codice_fiscale",
            "forma_giuridica",
            "iscrizione_cciaa",
            "codici_ateco",
            "oggetto_sociale",
            "sedi_legali",
            "sedi_operative",
            "autorizzazioni",
            "licenze",
            "rating_legalita",
            "attestazioni_soa",
            "referenze_bancarie",
            "polizze_assicurative",
            "presenza_territoriale",
            "fatturato",
            "ccnl",
            "dipendenti",
            "esperienze",
            "certificazioni",
            "servizi",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_partita_iva(self, value):
        try:
            return validate_partita_iva(value)
        except Exception as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_codice_fiscale(self, value):
        try:
            return validate_codice_fiscale(value)
        except Exception as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_forma_giuridica(self, value):
        if not value:
            return ""
        valid = {choice for choice, _ in Company.FormaGiuridica.choices}
        if value not in valid:
            raise serializers.ValidationError("Forma giuridica non valida.")
        return value

    def validate_ccnl(self, value):
        return value.strip()

    def validate_oggetto_sociale(self, value):
        return value.strip()

    def validate_iscrizione_cciaa(self, value):
        return self._validate_iscrizione_cciaa(value)

    def validate_codici_ateco(self, value):
        return self._validate_codici_ateco(value)

    def validate_sedi_legali(self, value):
        return self._validate_sedi(value, "sedi_legali")

    def validate_sedi_operative(self, value):
        return self._validate_sedi(value, "sedi_operative")

    def validate_autorizzazioni(self, value):
        return self._validate_titoli_scadenza(value, "autorizzazioni")

    def validate_licenze(self, value):
        return self._validate_titoli_scadenza(value, "licenze")

    def validate_rating_legalita(self, value):
        return self._validate_rating_legalita(value)

    def validate_attestazioni_soa(self, value):
        return self._validate_attestazioni_soa(value)

    def validate_referenze_bancarie(self, value):
        return self._validate_referenze_bancarie(value)

    def validate_polizze_assicurative(self, value):
        return self._validate_polizze_assicurative(value)

    def validate_presenza_territoriale(self, value):
        return self._validate_presenza_territoriale(value)

    def validate_certificazioni(self, value):
        return self._validate_certificazioni(value)

    def validate_dipendenti(self, value):
        return self._validate_dipendenti(value)

    def validate_esperienze(self, value):
        return self._validate_esperienze(value)

    def validate_servizi(self, value):
        return self._validate_string_list(value, "servizi")

    def validate(self, attrs):
        organization = None
        if self.instance:
            organization = self.instance.organization
        elif self.context.get("organization"):
            organization = self.context["organization"]

        partita_iva = attrs.get(
            "partita_iva",
            self.instance.partita_iva if self.instance else "",
        )
        if partita_iva and organization:
            duplicate = Company.objects.filter(
                organization=organization,
                partita_iva=partita_iva,
            )
            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError(
                    {"partita_iva": "Esiste già un'azienda con questa partita IVA."}
                )
        return attrs

    def _optional_date(self, value):
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    def _validate_string_list(self, value, field_name):
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError(
                    f"Ogni elemento di {field_name} deve essere una stringa."
                )
            stripped = item.strip()
            if stripped:
                cleaned.append(stripped)
        return cleaned

    def _validate_iscrizione_cciaa(self, value):
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("iscrizione_cciaa deve essere un oggetto.")
        rea = str(value.get("rea", "")).strip()
        provincia = str(value.get("provincia", "")).strip().upper()[:2]
        data_iscrizione = self._optional_date(value.get("data_iscrizione"))
        if provincia and not re.fullmatch(r"[A-Z]{2}", provincia):
            raise serializers.ValidationError(
                "La provincia CCIAA deve essere di 2 lettere."
            )
        return {
            "rea": rea,
            "provincia": provincia,
            "data_iscrizione": data_iscrizione,
        }

    def _validate_codici_ateco(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("codici_ateco deve essere una lista.")
        cleaned = []
        for item in value:
            if isinstance(item, str):
                codice = item.strip()
                if codice:
                    cleaned.append({"codice": codice, "descrizione": ""})
                continue
            if not isinstance(item, dict):
                raise serializers.ValidationError("Ogni codice ATECO deve essere un oggetto.")
            codice = str(item.get("codice", "")).strip()
            if not codice:
                continue
            descrizione = str(item.get("descrizione", "")).strip()
            cleaned.append({"codice": codice, "descrizione": descrizione})
        return cleaned

    def _validate_sedi(self, value, field_name):
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(f"Ogni sede in {field_name} deve essere un oggetto.")
            indirizzo = str(item.get("indirizzo", "")).strip()
            if not indirizzo:
                continue
            cap = str(item.get("cap", "")).strip()
            if cap and not re.fullmatch(r"\d{5}", cap):
                raise serializers.ValidationError(
                    f"CAP non valido per la sede: {indirizzo[:40]}"
                )
            provincia = str(item.get("provincia", "")).strip().upper()[:2]
            if provincia and not re.fullmatch(r"[A-Z]{2}", provincia):
                raise serializers.ValidationError(
                    f"Provincia non valida per la sede: {indirizzo[:40]}"
                )
            cleaned.append(
                {
                    "indirizzo": indirizzo,
                    "cap": cap,
                    "citta": str(item.get("citta", "")).strip(),
                    "provincia": provincia,
                    "nazione": str(item.get("nazione", "Italia")).strip() or "Italia",
                    "principale": bool(item.get("principale", False)),
                }
            )
        return cleaned

    def _validate_titoli_scadenza(self, value, field_name):
        if not isinstance(value, list):
            raise serializers.ValidationError(f"{field_name} deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"Ogni voce in {field_name} deve essere un oggetto."
                )
            nome = str(item.get("nome", "")).strip()
            if not nome:
                continue
            cleaned.append(
                {
                    "nome": nome,
                    "ente": str(item.get("ente", "")).strip(),
                    "numero": str(item.get("numero", "")).strip(),
                    "scadenza": self._optional_date(item.get("scadenza")),
                }
            )
        return cleaned

    def _validate_rating_legalita(self, value):
        if value in (None, ""):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("rating_legalita deve essere un oggetto.")
        stelle_raw = value.get("stelle")
        stelle = None
        if stelle_raw not in (None, ""):
            try:
                stelle = int(stelle_raw)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError(
                    "Il rating deve essere un numero intero."
                ) from exc
            if stelle < 1 or stelle > 3:
                raise serializers.ValidationError(
                    "Il rating di legalità va da 1 a 3 stelle."
                )
        return {
            "stelle": stelle,
            "ente": str(value.get("ente", "")).strip(),
            "scadenza": self._optional_date(value.get("scadenza")),
        }

    def _validate_attestazioni_soa(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("attestazioni_soa deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni attestazione SOA deve essere un oggetto."
                )
            categoria = str(item.get("categoria", "")).strip()
            if not categoria:
                continue
            cleaned.append(
                {
                    "categoria": categoria,
                    "classifica": str(item.get("classifica", "")).strip(),
                    "scadenza": self._optional_date(item.get("scadenza")),
                }
            )
        return cleaned

    def _validate_referenze_bancarie(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("referenze_bancarie deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni referenza bancaria deve essere un oggetto."
                )
            istituto = str(item.get("istituto", "")).strip()
            if not istituto:
                continue
            iban = re.sub(r"\s", "", str(item.get("iban", "")).strip().upper())
            if iban and not re.fullmatch(r"IT\d{2}[A-Z0-9]{23}", iban):
                raise serializers.ValidationError("IBAN italiano non valido.")
            cleaned.append(
                {
                    "istituto": istituto,
                    "filiale": str(item.get("filiale", "")).strip(),
                    "iban": iban,
                    "note": str(item.get("note", "")).strip(),
                }
            )
        return cleaned

    def _validate_polizze_assicurative(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("polizze_assicurative deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni polizza assicurativa deve essere un oggetto."
                )
            tipo = str(item.get("tipo", "")).strip()
            if not tipo:
                continue
            massimale = item.get("massimale")
            if massimale is not None:
                massimale = str(massimale).strip() or None
            cleaned.append(
                {
                    "tipo": tipo,
                    "compagnia": str(item.get("compagnia", "")).strip(),
                    "massimale": massimale,
                    "scadenza": self._optional_date(item.get("scadenza")),
                }
            )
        return cleaned

    def _validate_presenza_territoriale(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("presenza_territoriale deve essere una lista.")
        cleaned = []
        for item in value:
            if isinstance(item, str):
                regione = item.strip()
                if regione:
                    cleaned.append({"regione": regione, "province": [], "note": ""})
                continue
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni voce di presenza territoriale deve essere un oggetto."
                )
            regione = str(item.get("regione", "")).strip()
            if not regione:
                continue
            province_raw = item.get("province", [])
            province = []
            if isinstance(province_raw, list):
                province = [str(p).strip().upper()[:2] for p in province_raw if str(p).strip()]
            cleaned.append(
                {
                    "regione": regione,
                    "province": province,
                    "note": str(item.get("note", "")).strip(),
                }
            )
        return cleaned

    def _validate_certificazioni(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("certificazioni deve essere una lista.")
        cleaned = []
        for item in value:
            if isinstance(item, str):
                stripped = item.strip()
                if stripped:
                    cleaned.append({"nome": stripped, "ente": "", "scadenza": None})
                continue
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni certificazione deve essere un oggetto."
                )
            nome = str(item.get("nome", "")).strip()
            if not nome:
                continue
            ente = str(item.get("ente", "")).strip()
            scadenza = self._optional_date(item.get("scadenza"))
            cleaned.append({"nome": nome, "ente": ente, "scadenza": scadenza})
        return cleaned

    def _validate_dipendenti(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("dipendenti deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni voce dipendenti deve essere un oggetto."
                )
            categoria = str(item.get("categoria", "")).strip()
            if not categoria:
                continue
            try:
                numero = int(item.get("numero", 0))
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError(
                    "Il numero dipendenti deve essere un intero."
                ) from exc
            if numero < 0:
                raise serializers.ValidationError(
                    "Il numero dipendenti non può essere negativo."
                )
            cleaned.append({"categoria": categoria, "numero": numero})
        return cleaned

    def _validate_esperienze(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("esperienze deve essere una lista.")
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Ogni esperienza deve essere un oggetto."
                )
            titolo = str(item.get("titolo") or item.get("oggetto") or "").strip()
            if not titolo:
                continue
            committente = str(item.get("committente", "")).strip()
            descrizione = str(item.get("descrizione", "")).strip()
            anno = str(item.get("anno", "")).strip()
            importo = item.get("importo")
            if importo is not None:
                importo = str(importo).strip() or None
            cleaned.append(
                {
                    "titolo": titolo,
                    "committente": committente,
                    "anno": anno,
                    "importo": importo,
                    "descrizione": descrizione,
                }
            )
        return cleaned

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["certificazioni"] = self._normalize_certificazioni_output(
            instance.certificazioni
        )
        data["esperienze"] = self._normalize_esperienze_output(instance.esperienze)
        data["iscrizione_cciaa"] = instance.iscrizione_cciaa or {}
        data["rating_legalita"] = instance.rating_legalita or {}
        return data

    def _normalize_esperienze_output(self, value):
        if not value:
            return []
        cleaned = []
        for item in value:
            if not isinstance(item, dict):
                continue
            titolo = str(item.get("titolo") or item.get("oggetto") or "").strip()
            if not titolo:
                continue
            importo = item.get("importo")
            if importo is not None:
                importo = str(importo).strip() or None
            cleaned.append(
                {
                    "titolo": titolo,
                    "committente": str(item.get("committente", "")).strip(),
                    "anno": str(item.get("anno", "")).strip(),
                    "importo": importo,
                    "descrizione": str(item.get("descrizione", "")).strip(),
                }
            )
        return cleaned

    def _normalize_certificazioni_output(self, value):
        if not value:
            return []
        cleaned = []
        for item in value:
            if isinstance(item, str):
                stripped = item.strip()
                if stripped:
                    cleaned.append({"nome": stripped, "ente": "", "scadenza": None})
            elif isinstance(item, dict):
                nome = str(item.get("nome", "")).strip()
                if nome:
                    cleaned.append(
                        {
                            "nome": nome,
                            "ente": str(item.get("ente", "")).strip(),
                            "scadenza": item.get("scadenza"),
                        }
                    )
        return cleaned


import os

from .models import CompanyDocument
from .services.document_validity import days_until_expiry


class CompanyDocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    giorni_alla_scadenza = serializers.SerializerMethodField()

    class Meta:
        model = CompanyDocument
        fields = (
            "id",
            "categoria",
            "file",
            "original_filename",
            "content_type",
            "file_size",
            "data_rilascio",
            "data_scadenza",
            "note",
            "stato_validita",
            "giorni_alla_scadenza",
            "uploaded_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "original_filename",
            "content_type",
            "file_size",
            "stato_validita",
            "giorni_alla_scadenza",
            "uploaded_at",
            "updated_at",
        )

    def get_giorni_alla_scadenza(self, obj: CompanyDocument) -> int | None:
        return days_until_expiry(obj.data_scadenza)

    def validate_categoria(self, value):
        valid = {choice for choice, _ in CompanyDocument.Categoria.choices}
        if value not in valid:
            raise serializers.ValidationError("Categoria documento non valida.")
        return value

    def validate_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in CompanyDocument.ALLOWED_EXTENSIONS:
            allowed = ", ".join(sorted(CompanyDocument.ALLOWED_EXTENSIONS))
            raise serializers.ValidationError(
                f"Tipo file non supportato. Formati ammessi: {allowed}"
            )
        return value

    def validate(self, attrs):
        data_rilascio = attrs.get("data_rilascio")
        data_scadenza = attrs.get("data_scadenza")

        if self.instance:
            if "data_rilascio" not in attrs:
                data_rilascio = self.instance.data_rilascio
            if "data_scadenza" not in attrs:
                data_scadenza = self.instance.data_scadenza

        if data_rilascio and data_scadenza and data_scadenza < data_rilascio:
            raise serializers.ValidationError(
                {"data_scadenza": "La data di scadenza non può precedere la data di rilascio."}
            )
        if self.instance is None and not attrs.get("file"):
            raise serializers.ValidationError({"file": "Il file è obbligatorio."})
        return attrs

    def create(self, validated_data):
        uploaded_file = validated_data.pop("file")
        company = validated_data.pop("company")
        return CompanyDocument.objects.create(
            company=company,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            content_type=getattr(uploaded_file, "content_type", "") or "",
            file_size=uploaded_file.size,
            **validated_data,
        )

    def update(self, instance, validated_data):
        validated_data.pop("file", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class CompanyDocumentExpiringSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(source="company.id", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)
    giorni_alla_scadenza = serializers.SerializerMethodField()
    categoria_label = serializers.CharField(source="get_categoria_display", read_only=True)
    stato_validita_label = serializers.CharField(source="get_stato_validita_display", read_only=True)

    class Meta:
        model = CompanyDocument
        fields = (
            "id",
            "company_id",
            "company_name",
            "categoria",
            "categoria_label",
            "original_filename",
            "data_rilascio",
            "data_scadenza",
            "stato_validita",
            "stato_validita_label",
            "giorni_alla_scadenza",
            "note",
        )

    def get_giorni_alla_scadenza(self, obj: CompanyDocument) -> int | None:
        return days_until_expiry(obj.data_scadenza)
