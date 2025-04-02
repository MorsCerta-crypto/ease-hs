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
            Form(LabelInput("Grundriss Name", name="name", required=True),
                LabelInput("Breite (Meter)", name="width", type="number", value="20", min="5", max="100"),
                LabelInput("Höhe (Meter)", name="height", type="number", value="15", min="5", max="100"),
                Button("Erstellen", type="submit", hx_post=initialize_floorplan, hx_target="#main-content"))))

# Initialize a floor plan
@ar.post("/initialize_floorplan")
def initialize_floorplan(sess, req, name: str, width: float, height: float):
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
    return floorplan_editor(sess, req, floorplan_id=floorplan.id)

# Load existing floor plans
@ar.get("/load_floorplan")
def load_floorplan(sess, req):
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


def tools_panel():
    return  Div(Card(H4("Werkzeuge"),
                            DivVStacked(Div(Strong("Modus:"),
                                    Div(Radio("editMode", name="mode", value="edit", checked=True),
                                        Label("Bearbeiten", for_="editMode"),
                                        Radio("viewMode", name="mode", value="view"),
                                        Label("Ansicht", for_="viewMode"),
                                        cls="mode-switch"),cls="mb-4"),
                                Hr(),
                                Div(Strong("Werkzeuge (Bearbeitungsmodus):"),
                                    DivVStacked(
                                        Button("Auswählen/Resize/Bewegen", id="selectBtn", cls="tool-btn", data_tool="select", submit=False),
                                        Button("Wand zeichnen (Raster)", id="drawWallBtn", cls="tool-btn", data_tool="wall", submit=False),
                                        Button("Fenster (auf Wand)", id="drawWindowBtn", cls="tool-btn", data_tool="window", submit=False),
                                        Button("Tür (auf Wand)", id="drawDoorBtn", cls="tool-btn", data_tool="door-standard", submit=False),
                                        Button("Notausgang (auf Wand)", id="drawEmergencyDoorBtn", cls="tool-btn", data_tool="door-emergency", submit=False),
                                        Button("Fluchtweg (Mehrpunkt)", id="drawRouteBtn", cls="tool-btn", data_tool="emergency-route", submit=False),
                                        Button("Maschine (Rechteck -> Polygon)", id="drawMachineBtn", cls="tool-btn", data_tool="machine", submit=False),
                                        Button("Sicherheitsschrank (Rechteck -> Polygon)", id="drawClosetBtn", cls="tool-btn", data_tool="closet", submit=False),
                                        Button("Erste-Hilfe-Kasten", id="drawGearBtn", cls="tool-btn", data_tool="emergency-kit", submit=False),
                                        Button("Element LÖSCHEN", id="deleteBtn", cls="tool-btn", data_tool="delete", onclick="deleteSelectedElement()", submit=False),
                                        cls="gap-2"),
                                    cls="tools-section"),
                                cls="tools-container"),
                            cls=""),
                        cls="tools-panel")

def controls(floorplan_id: int):
    return Div(H4("Steuerung"),
                DivHStacked(
                    Button("Speichern", id="saveBtn", hx_post=f'/save_floorplan/{floorplan_id}', 
                            hx_target="#save-status", 
                            hx_vals="js:{elements: JSON.stringify(currentState.elements)}"),
                    Button("Als PNG exportieren", id="export-png"),
                    Button("Zurück zur Startseite", hx_get='/', hx_target="#main-content"),
                    Div(id="save-status"),
                    cls="gap-2"),
                Div(P("Maßstab: ", Span(id="scaleInfo", text="1 Pixel/Meter")),
                    P("Raster: ", Span(id="gridInfo", text="0.5 Meter")),
                    P("Status: ", Span(id="statusInfo", text="Bereit")),
                    P("Floorplan ID: ", Span(id="floorplanId")),
                    cls="mt-2"),
                cls="mb-4",id="controls")
    
def editor(floorplan_id: int, width, height, data):
    return Div(
        Div(Div(controls(floorplan_id),
                Div(Canvas(
                        width=1000, height=700, id="floorPlanCanvas",
                        data_floorplan_id=floorplan_id,
                        data_floorplan_elements=data,
                        data_width=width,
                        data_height=height),
                    tools_panel(),
                    cls="editor-main"),
                cls="editor-container")))

def floorplan_properties():
    return Div(Card(H4("Eigenschaften"),
                Div(id="element-properties", cls="properties-panel"),
                cls=""),
            cls="")

@ar.get("/floorplan_editor/{floorplan_id}/change-mode")
def change_mode(sess, req, floorplan_id: int):
    mode = sess['floorplan-mode']
    if mode == 'edit': sess['floorplan-mode'] = 'select'
    else: sess['floorplan-mode'] = 'edit'
    return floorplan_editor(sess, req, floorplan_id=floorplan_id)

@ar.get('/floorplan_editor/{floorplan_id}/element/{element_id}')
def get_element_properties(floorplan_id: int, element_id: str):
    try:
        props = element_properties.fetchone(
            where='floorplan_id=? AND element_id=?',
            where_args=(floorplan_id, element_id))
        if not props:return Div("Element nicht gefunden", cls="error-message")
        return Div(
            Card(H4("Eigenschaften"),
                Div(Form(LabelInput("Typ", name="element_type", value=props.element_type, readonly=True),
                        LabelInput("Breite (m)", name="width", type="number", value=props.width, readonly=True),
                        *[LabelInput(key.replace('_', ' ').title(),
                                name=f"properties.{key}",value=value,readonly=True)
                            for key, value in json.loads(props.properties).items()],
                        cls="element-props-form"),
                    cls="properties-panel"
                ),cls=""),cls="")
    except Exception as e:
        return Div(f"Fehler beim Laden der Eigenschaften: {str(e)}", cls="error-message")

@ar.get('/floorplan_editor/{floorplan_id}')
def floorplan_editor(sess, req, floorplan_id: int):
    if not 'floorplan-mode' in sess: sess['floorplan-mode'] = 'edit'
    mode = sess['floorplan-mode']
    floorplan = floorplans.fetchone(id=floorplan_id)
    if not floorplan: raise ValueError("Floorplan not found")
    if req.headers.get('Accept') == 'application/json':
        return {"elements": json.loads(floorplan.data),
            "config": {"width": floorplan.width,"height": floorplan.height,"mode": mode},
            "floorplan_id": floorplan_id}
    return Div(
        editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
        Script(src="/static/js/main.js",type="module"),
        cls="floorplan-editor",
        id="floorplan-editor-container",
        data_mode=mode)

@ar.post("/save_floorplan/{floorplan_id}")
def save_floorplan(floorplan_id: int, elements: str = "[]"):
    db_floorplan = floorplans.fetchone(id=floorplan_id)
    if not db_floorplan: raise ValueError("Floorplan not found")
    current_time = datetime.datetime.now().isoformat()
    db_floorplan.data = elements
    db_floorplan.updated_at = current_time
    floorplans.update(db_floorplan)
    return {"status": "success", "message": "Grundriss erfolgreich gespeichert"}

