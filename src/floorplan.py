from fasthtml.common import *
from monsterui.all import *
import json
from pathlib import Path
import datetime
from src.db import floorplans, element_properties

# Initialize FastHTML ar with blue theme
ar = APIRouter()

# Serialization/deserialization functions
# Create a new floor plan
@ar.get("/create_floorplan")
def create_floorplan():
    return Card(
        CardHeader(H3("Neuer Grundriss")),
        CardBody(
            Form(
                LabelInput("Grundriss Name", name="name", required=True),
                LabelInput("Breite (Meter)", name="width", type="number", value="20", min="5", max="100"),
                LabelInput("Höhe (Meter)", name="height", type="number", value="15", min="5", max="100"),
                Button("Erstellen", type="submit", hx_post=initialize_floorplan, hx_target="#main-content")
            )
        )
    )

# Initialize a floor plan
@ar.post("/initialize_floorplan")
def initialize_floorplan(sess, name: str, width: float, height: float):
    current_time = datetime.datetime.now().isoformat()
    # Assuming user_id = 1 for now - in a real app, this would come from auth
    floorplan = floorplans.insert(
        user_id=1,
        name=name,
        width=float(width),
        height=float(height),
        data="[]",
        created_at=current_time,
        updated_at=current_time)
    sess['floorplan-mode'] = 'edit'
    return floorplan_editor(sess, floorplan_id=floorplan.id)

# Load existing floor plans
@ar.get("/load_floorplan")
def load_floorplan():
    # Get list of floor plans from database
    db_floorplans = floorplans(where='user_id=?', where_args=(1,))
    if not db_floorplans:
        return Card(H3("Keine Grundrisse gefunden"),
            P("Keine vorhandenen Grundrisse gefunden. Erstellen Sie einen neuen, um zu beginnen."),
            Button("Neu erstellen", hx_get=create_floorplan, hx_target="#main-content"))
    
    return Card(
        CardHeader(H3("Grundriss laden")),
        CardBody(
            Div(P("Wählen Sie einen Grundriss zum Laden:"),
                Ul(*[Li(Button(plan.name, hx_get=floorplan_editor.to(floorplan_id=plan.id), hx_target="#main-content")) for plan in db_floorplans]),
                cls="space-y-4")))


def editor(floorplan_id: int, width, height, data):
    return Div(
            Div(
                Canvas(
                    width=900, height=800, id="floorplan-canvas",
                    data_floorplan_id=floorplan_id,
                    data_floorplan_elements=data,
                    data_width=width,
                    data_height=height
                ),
                cls=""
            ),
            cls=""
        )
    
def floorplan_properties():
    return Div(Card(H4("Eigenschaften"),
                Div(id="element-properties", cls="properties-panel"),
                cls=""),
            cls="")
    
def controls(floorplan_id:int):
    return DivHStacked(
            Button("Speichern", hx_post=f'/save_floorplan/{floorplan_id}', hx_target="#save-status", hx_vals="js:{elements: JSON.stringify(currentState.elements)}"),
            Button("Als PNG exportieren", id="export-png"),
            Button("Modus ändern", cls="tool-btn", hx_get=f"/floorplan_editor/{floorplan_id}/change-mode", hx_target="#floorplan-editor-container"),
            Button("Zurück zur Startseite", hx_get='/', hx_target="#main-content"),
            Div(id="save-status"))
    
    
def tools():
    return Div(
            Card(
                H4("Werkzeuge"),
                DivVStacked(
                Button("Auswählen", cls="tool-btn", data_tool="select", submit=False),
                Button("Wand", cls="tool-btn", data_tool="wall", submit=False),
                Button("Tür (Standard)", cls="tool-btn", data_tool="door-standard", submit=False),
                Button("Tür (Notausgang)", cls="tool-btn", data_tool="door-emergency", submit=False),
                Button("Fenster", cls="tool-btn", data_tool="window", submit=False),
                Button("Fluchtweg", cls="tool-btn", data_tool="emergency-route", submit=False),
                Button("Erste-Hilfe-Kasten", cls="tool-btn", data_tool="emergency-kit", submit=False),
                Button("Maschine", cls="tool-btn", data_tool="machine", submit=False),
                Button("Sicherheitsschrank", cls="tool-btn", data_tool="closet", submit=False),
                Button("Löschen", id="delete-btn", onclick="deleteSelectedElement()", submit=False),
                cls="gap-2"
            )))
    
@ar.get("/floorplan_editor/{floorplan_id}/change-mode")
def change_mode(sess, floorplan_id: int):
    mode = sess['floorplan-mode']
    if mode == 'edit':
        sess['floorplan-mode'] = 'select'
    else:
        sess['floorplan-mode'] = 'edit'
    return floorplan_editor(sess, floorplan_id=floorplan_id)

@ar.get('/floorplan_editor/{floorplan_id}/element/{element_id}')
def get_element_properties(floorplan_id: int, element_id: str):
    try:
        # Get element properties from database
        props = element_properties.fetchone(
            where='floorplan_id=? AND element_id=?',
            where_args=(floorplan_id, element_id)
        )
        
        if not props:
            return Div("Element nicht gefunden", cls="error-message")
            
        return Div(
            Card(
                H4("Eigenschaften"),
                Div(
                    Form(
                        LabelInput("Typ", name="element_type", value=props.element_type, readonly=True),
                        LabelInput("Breite (m)", name="width", type="number", value=props.width, readonly=True),
                        *[
                            LabelInput(
                                key.replace('_', ' ').title(),
                                name=f"properties.{key}",
                                value=value,
                                readonly=True
                            )
                            for key, value in json.loads(props.properties).items()
                        ],
                        cls="element-props-form"
                    ),
                    cls="properties-panel"
                ),
                cls=""
            ),
            cls=""
        )
    except Exception as e:
        return Div(f"Fehler beim Laden der Eigenschaften: {str(e)}", cls="error-message")

@ar.get('/floorplan_editor/{floorplan_id}')
def floorplan_editor(sess, floorplan_id: int):
    # Load floor plan data from database
    if not 'floorplan-mode' in sess: sess['floorplan-mode'] = 'edit'
    mode = sess['floorplan-mode']
    try:
        floorplan = floorplans.fetchone(id=floorplan_id)
        if not floorplan:
            raise ValueError("Floorplan not found")
    except Exception as e:
        return Card(
            H3("Fehler"),
            P(f"Grundriss konnte nicht geladen werden: {str(e)}"),
            Button("Zurück zur Startseite", hx_get='/', hx_target="#main-content"))
    
    return DivVStacked(
        controls(floorplan_id),
        DivHStacked(
            tools() if mode=='edit' else Div(id="element-properties", cls="properties-panel"),
            editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
        ),
        cls="floorplan-editor",
        id="floorplan-editor-container",
        data_mode=mode
    )

# Save floor plan
@ar.post("/save_floorplan/{floorplan_id}")
def save_floorplan(floorplan_id: int, elements: str = "[]"):
    try:
        # Get the current floorplan
        print(f'saving floorplan {floorplan_id} with elements: {elements}')
        db_floorplan = floorplans.fetchone(id=floorplan_id)
        if not db_floorplan:
            raise ValueError("Floorplan not found")
        
        # Update elements and timestamp
        current_time = datetime.datetime.now().isoformat()
        db_floorplan.data = elements
        db_floorplan.updated_at = current_time
        floorplans.update(db_floorplan)
        
        return Div("Grundriss erfolgreich gespeichert", cls="success-message", id='save-status', hx_swap="delete", hx_target='save-status', hx_trigger='every 20s')
    except Exception as e:
        return Div(f"Fehler beim Speichern des Grundrisses: {str(e)}", cls="error-message", id='save-status', hx_swap="delete", hx_target='save-status', hx_trigger='every 20s')

