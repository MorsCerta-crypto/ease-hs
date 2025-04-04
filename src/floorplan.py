from fasthtml.common import *
from monsterui.all import *
import json
from pathlib import Path
import datetime
from src.db import floorplans, elements

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
    return Redirect(f"/edit-floorplan/{floorplan.id}")

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
            A("Zurück zur Startseite", href='/', hx_target="#main-content"),
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
        props = elements.fetchone(
            where='floorplan_id=? AND element_id=?',
            where_args=(floorplan_id, element_id)
        )
        
        if not props:
            return Div("Element nicht gefunden", cls="error-message")
        
        special_types = ["machine", "closet", "emergency-kit"]
        
        if props.element_type in special_types:
            return Div(
                Card(
                    H4("Eigenschaften"),
                    Div(
                        Form(
                            LabelInput("Typ", name="element_type", value=props.element_type, readonly=True),
                            LabelInput("Name", name="name", value=props.name),
                            LabelTextArea("Allgemeine Informationen", name="description", value=props.description),
                            cls="element-props-form",
                            hx_post=f"/element/{floorplan_id}/{props.element_id}/update-basic",
                            hx_target="#element-properties"
                        ),
                        Button("Gefährdungsbeurteilung", 
                               cls="uk-button uk-button-primary uk-width-1-1 uk-margin-small-top",
                               hx_get=f"/element/{floorplan_id}/{props.element_id}/risk-assessment",
                               hx_target="#modal-container"),
                        Button("Betriebsanweisung", 
                               cls="uk-button uk-button-primary uk-width-1-1 uk-margin-small-top",
                               hx_get=f"/element/{floorplan_id}/{props.element_id}/operating-instructions",
                               hx_target="#modal-container"),
                        Button("Schulungsnachweise", 
                               cls="uk-button uk-button-primary uk-width-1-1 uk-margin-small-top",
                               hx_get=f"/element/{floorplan_id}/{props.element_id}/training-records",
                               hx_target="#modal-container"),
                        A("Sicherheitsdaten bearbeiten", 
                          href=f"/element/{floorplan_id}/{props.element_id}/safety",
                          cls="uk-button uk-button-secondary uk-width-1-1 uk-margin-small-top"),
                        Div(id="modal-container"),  # Container for modals
                        cls="properties-panel"
                    ),
                    cls=""
                ),
                cls=""
            )
        else:
            # For non-special elements, just return the simple properties view
            return Div(
                Card(
                    H4("Eigenschaften"),
                    Div(
                        Form(
                            LabelInput("Typ", name="element_type", value=props.element_type, readonly=True),
                            cls="element-props-form"
                        ),
                        cls="properties-panel"
                    ),
                    cls=""
                ),
                cls=""
            )
    except Exception as e:
        print(f"Exception: {e}, type: {type(e)}")
        return Div(f"Fehler beim Laden der Eigenschaften: {str(e)}", cls="error-message")


# Save floor plan
@ar.post("/save_floorplan/{floorplan_id}")
def save_floorplan(floorplan_id: int, elements: str = "[]"):
    try:
        # Get the current floorplan
        print(f'saving floorplan {floorplan_id} with elements: {elements}')
        db_floorplan = floorplans(where='id=?', where_args=(floorplan_id,))
        if not db_floorplan:
            raise ValueError("Floorplan not found")
        else: db_floorplan = db_floorplan[0]
        # Update elements and timestamp
        current_time = datetime.datetime.now().isoformat()
        db_floorplan.data = elements
        db_floorplan.updated_at = current_time
        floorplans.update(db_floorplan)
        print(f'floorplan {floorplan_id} updated')
        # Process special elements (machine, closet, emergency-kit)
        save_special_elements(floorplan_id, json.loads(elements), current_time)
        
        return Div("Grundriss erfolgreich gespeichert", cls="success-message", id='save-status', hx_swap="delete", hx_target='save-status', hx_trigger='every 20s')
    except Exception as e:
        return Div(f"Fehler beim Speichern des Grundrisses: {str(e)}", cls="error-message", id='save-status', hx_swap="delete", hx_target='save-status', hx_trigger='every 20s')

def save_special_elements(floorplan_id, elements_data, timestamp):
    # Types that require special safety handling
    special_types = ["machine", "closet", "emergency-kit"]
    
    for element in elements_data:
        if element.get("element_type") not in special_types:
            print(f'not saving element {element.get("id")} {element.get("element_type")}')
            continue
        element_id = element.get("id")
        element_type = element.get("element_type")
        
        # Check if element already exists in the elements table
        existing = elements(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if existing:
            # Element exists, just update the timestamp
            existing = existing[0]
            print(f"Updating existing element: {element_id}, {element_type}")
            existing.updated_at = timestamp
            elements.update(existing)
        else:
            # Create new element with default values
            print(f"Creating new element: {element_id}, {element_type}")
            elements.insert(
                floorplan_id=floorplan_id,
                element_id=element_id,
                element_type=element_type,
                name=f"New {element_type.title()}",
                description="",
                dangers="",
                safety_instructions="",
                trained_employees="[]",
                maintenance_schedule="",
                last_maintenance=None,
                created_at=timestamp,
                updated_at=timestamp
            )
            

@ar.delete("/delete-floorplan/{floorplan_id}")
def delete_floorplan(floorplan_id: int):
    floorplans.delete(floorplan_id)


@ar.get("/edit-floorplan/{floorplan_id}")
def edit_floorplan_page(sess, floorplan_id: int):
    sess['floorplan-mode'] = 'edit'
    
    try:
        floorplan = floorplans(where='id=?', where_args=(floorplan_id,))
        if not floorplan:
            raise ValueError("Floorplan not found")
        else: floorplan = floorplan[0]
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
                A('Wechseln zu Anzeige', href=f'/show-floorplan/{floorplan_id}', cls="uk-button uk-button-default"),
                A("Zurück zur Übersicht", href="/", cls="uk-button uk-button-default")
            ),
            Container(
                DivVStacked(
                    controls(floorplan_id),
                    DivHStacked(
                        tools(),
                        Div(
                            editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
                            Div(id="status-message", style="display:none;position:absolute;top:10px;right:10px;padding:5px 10px;background-color:rgba(0,0,0,0.6);color:white;border-radius:3px;"), 
                            cls="position-relative"
                        ),
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
        floorplan = floorplans(where='id=?', where_args=(floorplan_id,))
        if not floorplan:
            raise ValueError("Floorplan not found")
        else: floorplan = floorplan[0]
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
    print(floorplan.height)
    return Main(
        Head(
            Title(f"Grundriss anzeigen: {floorplan.name}"),
            Script(src="/static/js/floorplanner/show.js")
        ),
        Body(
            NavBar(
                H3("Safety Floor Planner"),
                A('Wechseln zu Bearbeiten', href=f'/edit-floorplan/{floorplan_id}', cls="uk-button uk-button-default"),
                A("Zurück zur Übersicht", href="/", cls="uk-button uk-button-default")
            ),
            Container(
                DivVStacked(
                    Div(
                        H3(f"Grundriss: {floorplan.name}"),
                        cls="view-header"
                    ),
                    DivHStacked(
                        editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
                        floorplan_properties(), 
                        cls="uk-grid uk-child-width-expand"
                    ),
                    cls="floorplan-viewer",
                    id="floorplan-viewer-container"
                ),
                cls=("mt-5", "uk-container-xl")
            )
        )
    )

@ar.get('/floorplan_editor/{floorplan_id}/elements')
def get_floorplan_elements(floorplan_id: int):
    try:
        # Get the floorplan from database
        db_floorplan = floorplans(where='id=?', where_args=(floorplan_id,))
        if not db_floorplan:
            return {"error": "Floorplan not found"}, 404
        else: db_floorplan = db_floorplan[0]
        print(db_floorplan.data)
        # Parse and return the elements
        return db_floorplan.data
    except Exception as e:
        return {"error": f"Error loading elements: {str(e)}"}, 500

@ar.get('/element/{floorplan_id}/{element_id}/safety')
def element_safety_form(floorplan_id: int, element_id: str):
    try:
        # Get the element from database
        element = elements(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        else: element = element[0]
        return Main(
            Head(
                Title(f"Sicherheitsdaten für {element.name}")
            ),
            Body(
                NavBar(
                    H3("Safety Floor Planner"),
                    A("Zurück zur Übersicht", href="/", cls="uk-button uk-button-default"),
                    A("Zurück zum Grundriss", href=f"/edit-floorplan/{floorplan_id}", cls="uk-button uk-button-primary")
                ),
                Container(
                    Card(
                        CardHeader(H3(f"Sicherheitsdaten für {element.name}")),
                        CardBody(
                            Form(
                                LabelInput("Name", name="name", value=element.name, required=True),
                                LabelInput("Typ", name="element_type", value=element.element_type, readonly=True),
                                LabelTextArea("Beschreibung", name="description", value=element.description),
                                LabelTextArea("Gefahren", name="dangers", value=element.dangers),
                                LabelTextArea("Sicherheitshinweise", name="safety_instructions", value=element.safety_instructions),
                                LabelInput("Geschulte Mitarbeiter (Namen, durch Komma getrennt)", name="trained_employees", 
                                           value=", ".join(json.loads(element.trained_employees)) if element.trained_employees else ""),
                                LabelInput("Wartungsplan", name="maintenance_schedule", value=element.maintenance_schedule),
                                LabelInput("Letzte Wartung", name="last_maintenance", type="date", 
                                           value=element.last_maintenance.split("T")[0] if element.last_maintenance else ""),
                                Button("Speichern", type="submit", cls="uk-button uk-button-primary"),
                                hx_post=f"/element/{floorplan_id}/{element_id}/safety/save",
                            )
                        )
                    ),
                    cls=("mt-5", "uk-container-xl")
                )
            )
        )
    except Exception as e:
        return Div(f"Fehler beim Laden der Sicherheitsdaten: {str(e)}", cls="error-message")

@ar.post('/element/{floorplan_id}/{element_id}/safety/save')
def save_element_safety(floorplan_id: int, element_id: str, name: str, description: str, dangers: str, 
                         safety_instructions: str, trained_employees: str, maintenance_schedule: str, 
                         last_maintenance: str = ""):
    try:
        # Get the element
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        # Format employees as JSON list
        employees_list = [emp.strip() for emp in trained_employees.split(',') if emp.strip()]
        
        # Update element
        element.name = name
        element.description = description
        element.dangers = dangers
        element.safety_instructions = safety_instructions
        element.trained_employees = json.dumps(employees_list)
        element.maintenance_schedule = maintenance_schedule
        
        if last_maintenance:
            element.last_maintenance = f"{last_maintenance}T00:00:00"
            
        element.updated_at = datetime.datetime.now().isoformat()
        elements.update(element)
        
        return Redirect(f"/show-floorplan/{floorplan_id}")
    except Exception as e:
        return Div(f"Fehler beim Speichern der Sicherheitsdaten: {str(e)}", cls="error-message")

@ar.post('/element/{floorplan_id}/{element_id}/update-basic')
def update_element_basic(floorplan_id: int, element_id: str, name: str, description: str):
    try:
        # Get the element
        element = elements.fetchone(
            where="floorplan_id=? AND element_id=?",
            where_args=(floorplan_id, element_id)
        )
        
        if not element:
            return Div("Element nicht gefunden", cls="error-message")
        
        # Update element basic info
        element.name = name
        element.description = description
        element.updated_at = datetime.datetime.now().isoformat()
        elements.update(element)
        
        # Return the updated properties view
        return get_element_properties(floorplan_id, element_id)
    except Exception as e:
        return Div(f"Fehler beim Speichern: {str(e)}", cls="error-message")

