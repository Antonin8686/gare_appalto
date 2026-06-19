class LlmProvider:
    GROQ = "groq"
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"

    CHOICES = (GROQ, OPENAI, AZURE_OPENAI)


class AiActionType:
    TECHNICAL_CRITERION = "technical_criterion"
    IMPROVEMENT_PROPOSAL = "improvement_proposal"
    CONTENT_ADAPTATION = "content_adaptation"
    REPORT_STRUCTURE = "report_structure"

    CHOICES = (
        TECHNICAL_CRITERION,
        IMPROVEMENT_PROPOSAL,
        CONTENT_ADAPTATION,
        REPORT_STRUCTURE,
    )

    LABELS = {
        TECHNICAL_CRITERION: "Generazione criterio tecnico",
        IMPROVEMENT_PROPOSAL: "Proposta migliorie",
        CONTENT_ADAPTATION: "Adattamento contenuti",
        REPORT_STRUCTURE: "Generazione struttura relazione",
    }
