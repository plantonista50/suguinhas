from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

def process_text(text: str, mode: str):
    if mode == "proxy":
        return text, None

    results = analyzer.analyze(
        text=text,
        language="pt"
    )

    anonymized = anonymizer.anonymize(
        text=text,
        analyzer_results=results
    )

    return anonymized.text, results
