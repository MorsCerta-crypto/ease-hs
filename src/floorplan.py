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
    return Main(
        Head(
            Title("Neuer Grundriss")
        ),
        Body(
            NavBar(
                H3("Safety Floor Planner"),
                A("Zurück zur Übersicht", href="/", cls="uk-button uk-button-default")
            ),
            Container(
                Card(
                    CardHeader(H3("Neuer Grundriss")),
                    CardBody(
                        Form(
                            LabelInput("Grundriss Name", name="name", required=True),
                            LabelInput("Breite (Meter)", name="width", type="number", value="20", min="5", max="100"),
                            LabelInput("Höhe (Meter)", name="height", type="number", value="15", min="5", max="100"),
                            Button("Erstellen", type="submit", hx_post=initialize_floorplan)
                        )
                    )
                ),
                cls=("mt-5", "uk-container-xl")
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
    
    # Redirect to the edit page
    return RedirectResponse(f"/edit-floorplan/{floorplan.id}")

# Load existing floor plans



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

@ar.get("/edit-floorplan/{floorplan_id}")
def edit_floorplan_page(sess, floorplan_id: int):
    sess['floorplan-mode'] = 'edit'
    
    try:
        floorplan = floorplans.fetchone(id=floorplan_id)
        if not floorplan:
            raise ValueError("Floorplan not found")
    except Exception as e:
        return Main(
            Head(Title("Fehler")),
            Body(
                Card(
                    H3("Fehler"),
                    P(f"Grundriss konnte nicht geladen werden: {str(e)}"),
                    A("Zurück zur Startseite", href='/', cls="uk-button uk-button-primary")
                )
            )
        )
    
    return Main(
        Head(
            Title(f"Grundriss bearbeiten: {floorplan.name}"),
            Script(src="/static/js/floorplanner/core.js"),
            Script(src="/static/js/floorplanner/elements.js"),
            Script(src="/static/js/floorplanner/ui.js"),
            Script(src="/static/js/floorplanner/render.js")
        ),
        Body(
            NavBar(
                H3("Safety Floor Planner"),
                A("Zurück zur Übersicht", href="/", cls="uk-button uk-button-default")
            ),
            Container(
                DivVStacked(
                    controls(floorplan_id),
                    DivHStacked(
                        tools(),
                        editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
                        floorplan_properties()
                    ),
                    cls="floorplan-editor",
                    id="floorplan-editor-container",
                    data_mode="edit"
                ),
                cls=("mt-5", "uk-container-xl")
            )
        )
    )

@ar.get("/show-floorplan/{floorplan_id}")
def show_floorplan_page(floorplan_id: int):
    try:
        floorplan = floorplans.fetchone(id=floorplan_id)
        if not floorplan:
            raise ValueError("Floorplan not found")
    except Exception as e:
        return Main(
            Head(Title("Fehler")),
            Body(
                Card(
                    H3("Fehler"),
                    P(f"Grundriss konnte nicht geladen werden: {str(e)}"),
                    A("Zurück zur Startseite", href='/', cls="uk-button uk-button-primary")
                )
            )
        )
    
    return Main(
        Head(
            Title(f"Grundriss anzeigen: {floorplan.name}"),
            Script(src="/static/js/floorplanner/core.js"),
            Script(src="/static/js/floorplanner/elements.js"),
            Script(src="/static/js/floorplanner/show.js")
        ),
        Body(
            NavBar(
                H3("Safety Floor Planner"),
                A("Zurück zur Übersicht", href="/", cls="uk-button uk-button-default")
            ),
            Container(
                DivVStacked(
                    Div(
                        H3(f"Grundriss: {floorplan.name}"),
                        cls="view-header"
                    ),
                    editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
                    cls="floorplan-viewer",
                    id="floorplan-viewer-container"
                ),
                cls=("mt-5", "uk-container-xl")
            )
        )
    )

