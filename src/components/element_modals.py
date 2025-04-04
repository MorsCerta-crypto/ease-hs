"""
Element modals for risk assessment, operating instructions, and training records.
"""
from fasthtml.common import *
from monsterui.all import *
import json
import datetime
from src.db import elements, risk_assessments, operating_instructions, training_records, documents

def modal_wrapper(title, content, modal_id="modal"):
    """Generic modal wrapper for all modals"""
    return Modal(
        content,
        header=Div(
            H3(title, cls="uk-modal-title"),
            ModalCloseButton()
        ),
        cls="uk-modal-container",
        dialog_cls="uk-modal-dialog uk-margin-auto-vertical",
        header_cls="uk-modal-header bg-white dark:bg-gray-800",
        body_cls="uk-modal-body bg-white dark:bg-gray-800",
        id=modal_id,
        open=True
    )
# Risk Assessment Components
def risk_assessment_modal(floorplan_id, element_id):
    """Modal for viewing and managing risk assessments"""
    try:
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        # Get all risk assessments for this element
        risks = risk_assessments(
            where="element_id=?",
            where_args=(element.id,)
        )
        
        risks_table = Table(
            Thead(
                Tr(
                    Thead("Beschreibung"),
                    Thead("Risikobewertung"),
                    Thead("Maßnahmen"),
                    Thead("Aktionen")
                )
            ),
            Tbody(
                *[
                    Tr(
                        Td(risk.description),
                        Td(f"{risk.risk_score} ({risk.frequency}×{risk.severity}×{risk.probability})"),
                        Td(
                            Div(
                                P(f"Technisch: {', '.join(json.loads(risk.technical_measures))}"),
                                P(f"Organisatorisch: {', '.join(json.loads(risk.organizational_measures))}"),
                                P(f"Persönlich: {', '.join(json.loads(risk.personal_measures))}")
                            )
                        ),
                        Td(
                            Button("Bearbeiten", 
                                 cls="uk-button uk-button-small uk-button-primary",
                                 hx_get=f"/element/{floorplan_id}/{element_id}/risk/{risk.id}/edit",
                                 hx_target="#modal-container"),
                            Button("Löschen", 
                                 cls="uk-button uk-button-small uk-button-danger",
                                 hx_delete=f"/element/{floorplan_id}/{element_id}/risk/{risk.id}",
                                 hx_confirm="Sind Sie sicher?",
                                 hx_target="#modal-container")
                        )
                    ) for risk in risks
                ] if risks else [
                    Tr(
                        Td(Div("Keine Gefährdungen erfasst", colspan="4"))
                    )
                ]
            ),
            cls="uk-table uk-table-striped uk-table-small"
        )
        
        content = Div(
            P(f"Gefährdungsbeurteilung für {element.name}"),
            Div(risks_table),
            Button("Neue Gefährdung hinzufügen", 
                 cls="uk-button uk-button-primary uk-margin-top",
                 hx_get=f"/element/{floorplan_id}/{element_id}/risk/new",
                 hx_target="#modal-container"),
            Button("Schließen", 
                 cls="uk-button uk-button-default uk-modal-close uk-margin-top uk-margin-left")
        )
        
        return modal_wrapper("Gefährdungsbeurteilung", content, "risk-modal")
        
    except Exception as e:
        return Div(f"Fehler Gefährdungsbeurteilung: {str(e)}", cls="error-message")

def risk_assessment_form(floorplan_id, element_id, risk_id=None):
    """Form for creating or editing a risk assessment"""
    try:
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        risk = None
        if risk_id:
            risk = risk_assessments.fetchone(
                where="id=? AND element_id=?",
                where_args=(risk_id, element.id)
            )
        
        title = "Neue Gefährdung hinzufügen" if not risk else "Gefährdung bearbeiten"
        
        # Default values for new risk or use existing values
        description = risk.description if risk else ""
        frequency = risk.frequency if risk else 1
        severity = risk.severity if risk else 1
        probability = risk.probability if risk else 1
        technical = json.loads(risk.technical_measures) if risk and risk.technical_measures else []
        organizational = json.loads(risk.organizational_measures) if risk and risk.organizational_measures else []
        personal = json.loads(risk.personal_measures) if risk and risk.personal_measures else []
        
        # Create form inputs for measures
        technical_inputs = Div(
            H5("Technische Maßnahmen"),
            Div(id="technical-measures-container", cls="measures-container"),
            *[Div(
                Input(type="text", value=measure, name=f"technical_measures[]", cls="uk-input uk-margin-small-bottom"),
                Button("×", cls="uk-button uk-button-small uk-button-danger", 
                      onclick="this.parentNode.remove();"),
                cls="measure-input uk-flex"
            ) for measure in technical],
            Button("+ Hinzufügen", cls="uk-button uk-button-small uk-button-default", 
                  onclick="""
                  const container = document.getElementById('technical-measures-container');
                  const div = document.createElement('div');
                  div.className = 'measure-input uk-flex';
                  div.innerHTML = `
                      <input type="text" name="technical_measures[]" class="uk-input uk-margin-small-bottom">
                      <button class="uk-button uk-button-small uk-button-danger" onclick="this.parentNode.remove();">×</button>
                  `;
                  container.appendChild(div);
                  """),
            cls="uk-margin"
        )
        
        organizational_inputs = Div(
            H5("Organisatorische Maßnahmen"),
            Div(id="organizational-measures-container", cls="measures-container"),
            *[Div(
                Input(type="text", value=measure, name=f"organizational_measures[]", cls="uk-input uk-margin-small-bottom"),
                Button("×", cls="uk-button uk-button-small uk-button-danger", 
                      onclick="this.parentNode.remove();"),
                cls="measure-input uk-flex"
            ) for measure in organizational],
            Button("+ Hinzufügen", cls="uk-button uk-button-small uk-button-default", 
                  onclick="""
                  const container = document.getElementById('organizational-measures-container');
                  const div = document.createElement('div');
                  div.className = 'measure-input uk-flex';
                  div.innerHTML = `
                      <input type="text" name="organizational_measures[]" class="uk-input uk-margin-small-bottom">
                      <button class="uk-button uk-button-small uk-button-danger" onclick="this.parentNode.remove();">×</button>
                  `;
                  container.appendChild(div);
                  """),
            cls="uk-margin"
        )
        
        personal_inputs = Div(
            H5("Persönliche Maßnahmen"),
            Div(id="personal-measures-container", cls="measures-container"),
            *[Div(
                Input(type="text", value=measure, name=f"personal_measures[]", cls="uk-input uk-margin-small-bottom"),
                Button("×", cls="uk-button uk-button-small uk-button-danger", 
                      onclick="this.parentNode.remove();"),
                cls="measure-input uk-flex"
            ) for measure in personal],
            Button("+ Hinzufügen", cls="uk-button uk-button-small uk-button-default", 
                  onclick="""
                  const container = document.getElementById('personal-measures-container');
                  const div = document.createElement('div');
                  div.className = 'measure-input uk-flex';
                  div.innerHTML = `
                      <input type="text" name="personal_measures[]" class="uk-input uk-margin-small-bottom">
                      <button class="uk-button uk-button-small uk-button-danger" onclick="this.parentNode.remove();">×</button>
                  `;
                  container.appendChild(div);
                  """),
            cls="uk-margin"
        )
        
        form = Form(
            LabelTextArea("Beschreibung der Gefährdung", name="description", value=description, required=True),
            Div(
                H5("Risikobewertung"),
                Div(
                    Div(
                        Label("Häufigkeit (1-5)", for_id="frequency"),
                        Input(type="number", name="frequency", id="frequency", value=frequency, min="1", max="5", cls="uk-input"),
                        cls="uk-width-1-3"
                    ),
                    Div(
                        Label("Schweregrad (1-5)", for_id="severity"),
                        Input(type="number", name="severity", id="severity", value=severity, min="1", max="5", cls="uk-input"),
                        cls="uk-width-1-3"
                    ),
                    Div(
                        Label("Wahrscheinlichkeit (1-5)", for_id="probability"),
                        Input(type="number", name="probability", id="probability", value=probability, min="1", max="5", cls="uk-input"),
                        cls="uk-width-1-3"
                    ),
                    cls="uk-grid uk-child-width-1-3"
                ),
                cls="uk-margin"
            ),
            Div(
                H5("Schutzmaßnahmen"),
                technical_inputs,
                organizational_inputs,
                personal_inputs,
                cls="uk-margin"
            ),
            Input(type="hidden", name="element_db_id", value=element.id),
            cls="uk-form-stacked",
            hx_post=f"/element/{floorplan_id}/{element_id}/risk/{'update/'+str(risk_id) if risk_id else 'create'}",
            hx_target="#modal-container"
        )
        
        action_buttons = Div(
            Button("Speichern", type="submit", cls="uk-button uk-button-primary"),
            Button("Abbrechen", 
                  cls="uk-button uk-button-default uk-margin-left",
                  hx_get=f"/element/{floorplan_id}/{element_id}/risk-assessment",
                  hx_target="#modal-container"),
            cls="uk-margin-top"
        )
        
        return modal_wrapper(title, Div(form, action_buttons), "risk-form-modal")
        
    except Exception as e:
        return Div(f"Fehler Gefährdungsbeurteilung: {str(e)}", cls="error-message")

# Operating Instructions Components
def operating_instructions_modal(floorplan_id, element_id):
    """Modal for viewing and managing operating instructions"""
    try:
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        # Get operating instructions for this element
        instruction = operating_instructions(
            where="element_id=?",
            where_args=(element.id,)
        )
        
        if instruction:
            # Parse JSON data
            hazard_symbols = json.loads(instruction.hazard_symbols) if instruction.hazard_symbols else []
            protection_measures = json.loads(instruction.protection_measures) if instruction.protection_measures else []
            first_aid = json.loads(instruction.first_aid) if instruction.first_aid else []
            emergency_procedures = json.loads(instruction.emergency_procedures) if instruction.emergency_procedures else []
            
            # Create tabs using UK UIkit classes directly instead of Components
            content = Div(
                Div(
                    # Tab navigation
                    Ul(
                        Li(A("Gefahrstoffe", href="#"), cls="uk-active"),
                        Li(A("Schutzmaßnahmen", href="#")),
                        Li(A("Erste Hilfe", href="#")),
                        Li(A("Notfall/Brand", href="#")),
                        Li(A("Instandsetzung/Entsorgung", href="#")),
                        cls="uk-tab"
                    ),
                    # Tab content
                    Div(
                        # Gefahrstoffe
                        Div(
                            *[Div(
                                Div(item.get("symbol", ""), cls="symbol"),
                                P(item.get("text", "")),
                                cls="hazard-item"
                            ) for item in hazard_symbols] if hazard_symbols else [
                                P("Keine Gefahrstoffe definiert.")
                            ],
                            cls="uk-active"
                        ),
                        # Schutzmaßnahmen
                        Div(
                            *[Div(
                                Div(item.get("symbol", ""), cls="symbol"),
                                P(item.get("text", "")),
                                cls="protection-item"
                            ) for item in protection_measures] if protection_measures else [
                                P("Keine Schutzmaßnahmen definiert.")
                            ]
                        ),
                        # Erste Hilfe
                        Div(
                            *[Div(
                                Div(item.get("symbol", ""), cls="symbol"),
                                P(item.get("text", "")),
                                cls="first-aid-item"
                            ) for item in first_aid] if first_aid else [
                                P("Keine Erste-Hilfe-Anweisungen definiert.")
                            ]
                        ),
                        # Notfall/Brand
                        Div(
                            *[Div(
                                Div(item.get("symbol", ""), cls="symbol"),
                                P(item.get("text", "")),
                                cls="emergency-item"
                            ) for item in emergency_procedures] if emergency_procedures else [
                                P("Keine Notfallanweisungen definiert.")
                            ]
                        ),
                        # Instandsetzung/Entsorgung
                        Div(
                            P(instruction.maintenance_disposal if instruction.maintenance_disposal else "Keine Informationen zur Instandsetzung/Entsorgung definiert.")
                        ),
                        cls="uk-switcher uk-margin"
                    ),
                    uk_switcher="animation: uk-animation-fade"
                ),
                Button("Bearbeiten", 
                     cls="uk-button uk-button-primary uk-margin-top",
                     hx_get=f"/element/{floorplan_id}/{element_id}/instructions/edit",
                     hx_target="#modal-container"),
                Button("Schließen", 
                     cls="uk-button uk-button-default uk-modal-close uk-margin-top uk-margin-left")
            )
        else:
            content = Div(
                P("Keine Betriebsanweisung vorhanden."),
                Button("Erstellen", 
                     cls="uk-button uk-button-primary uk-margin-top",
                     hx_get=f"/element/{floorplan_id}/{element_id}/instructions/new",
                     hx_target="#modal-container"),
                Button("Schließen", 
                     cls="uk-button uk-button-default uk-modal-close uk-margin-top uk-margin-left")
            )
        
        return modal_wrapper(f"Betriebsanweisung: {element.name}", content, "instructions-modal")
        
    except Exception as e:
        return Div(f"Fehler Betriebsanweisung: {str(e)} {type(e)}", cls="error-message")

# Training Records Components
def training_records_modal(floorplan_id, element_id):
    """Modal for viewing and managing training records"""
    try:
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        # Get training records for this element
        records = training_records(
            where="element_id=?",
            where_args=(element.id,)
        )
        
        records_table = Table(
            Thead(
                Tr(
                    Thead("Mitarbeiter"),
                    Thead("Schulung"),
                    Thead("Datum"),
                    Thead("Dokumente"),
                    Thead("Aktionen")
                )
            ),
            Tbody(
                *[
                    Tr(
                        Td(record.employee_name),
                        Td(record.training_name),
                        Td(record.training_date),
                        Td(
                            Div(
                                *[A(f"Dokument {i+1}", href=f"/document/{doc_id}", target="_blank") 
                                  for i, doc_id in enumerate(json.loads(record.document_ids))]
                                if record.document_ids else [Span("Keine Dokumente")]
                            )
                        ),
                        Td(
                            Button("Bearbeiten", 
                                 cls="uk-button uk-button-small uk-button-primary",
                                 hx_get=f"/element/{floorplan_id}/{element_id}/training/{record.id}/edit",
                                 hx_target="#modal-container"),
                            Button("Löschen", 
                                 cls="uk-button uk-button-small uk-button-danger",
                                 hx_delete=f"/element/{floorplan_id}/{element_id}/training/{record.id}",
                                 hx_confirm="Sind Sie sicher?",
                                 hx_target="#modal-container")
                        )
                    ) for record in records
                ] if records else [
                    Tr(
                        Td(Div("Keine Schulungsnachweise erfasst", colspan="5"))
                    )
                ]
            ),
            cls="uk-table uk-table-striped uk-table-small"
        )
        
        content = Div(
            P(f"Schulungsnachweise für {element.name}"),
            Div(records_table),
            Button("Neuen Schulungsnachweis hinzufügen", 
                 cls="uk-button uk-button-primary uk-margin-top",
                 hx_get=f"/element/{floorplan_id}/{element_id}/training/new",
                 hx_target="#modal-container"),
            Button("Schließen", 
                 cls="uk-button uk-button-default uk-modal-close uk-margin-top uk-margin-left")
        )
        
        return modal_wrapper("Schulungsnachweise", content, "training-modal")
        
    except Exception as e:
        return Div(f"Fehler Schulungsnachweise: {str(e)}", cls="error-message")

def training_record_form(floorplan_id, element_id, record_id=None):
    """Form for creating or editing a training record"""
    try:
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        record = None
        if record_id:
            record = training_records.fetchone(
                where="id=? AND element_id=?",
                where_args=(record_id, element.id)
            )
        
        title = "Neuen Schulungsnachweis hinzufügen" if not record else "Schulungsnachweis bearbeiten"
        
        # Default values for new record or use existing values
        employee_name = record.employee_name if record else ""
        training_name = record.training_name if record else ""
        training_date = record.training_date if record else datetime.datetime.now().strftime("%Y-%m-%d")
        document_ids = json.loads(record.document_ids) if record and record.document_ids else []
        
        # Create file upload section
        file_upload = Div(
            H5("Dokumente"),
            Div(
                *[Div(
                    Span(f"Dokument {i+1}"),
                    Button("×", cls="uk-button uk-button-small uk-button-danger", 
                           onclick="this.parentNode.remove();"),
                    Input(type="hidden", name="document_ids[]", value=doc_id),
                    cls="document-item uk-flex uk-flex-middle"
                ) for i, doc_id in enumerate(document_ids)],
                id="documents-container"
            ),
            Div(
                Label("Neues Dokument hochladen", for_id="file-upload"),
                Input(type="file", id="file-upload", name="document", cls="uk-input"),
                Button("Hochladen", 
                      cls="uk-button uk-button-small uk-button-default",
                      hx_post=f"/element/{floorplan_id}/{element_id}/document/upload",
                      hx_target="#upload-status",
                      hx_swap="outerHTML",
                      hx_trigger="click"),
                Div(id="upload-status"),
                cls="uk-margin"
            ),
            cls="uk-margin"
        )
        
        form = Form(
            LabelInput("Mitarbeiter", name="employee_name", value=employee_name, required=True),
            LabelInput("Schulung", name="training_name", value=training_name, required=True),
            LabelInput("Datum", name="training_date", type="date", value=training_date, required=True),
            file_upload,
            Input(type="hidden", name="element_db_id", value=element.id),
            cls="uk-form-stacked",
            hx_post=f"/element/{floorplan_id}/{element_id}/training/{'update/'+str(record_id) if record_id else 'create'}",
            hx_target="#modal-container",
            hx_encoding="multipart/form-data"
        )
        
        action_buttons = Div(
            Button("Speichern", type="submit", cls="uk-button uk-button-primary"),
            Button("Abbrechen", 
                  cls="uk-button uk-button-default uk-margin-left",
                  hx_get=f"/element/{floorplan_id}/{element_id}/training-records",
                  hx_target="#modal-container"),
            cls="uk-margin-top"
        )
        
        return modal_wrapper(title, Div(form, action_buttons), "training-form-modal")
        
    except Exception as e:
        return Div(f"Fehler Schulungsnachweise: {str(e)}", cls="error-message") 