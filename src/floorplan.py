from fasthtml.common import *
from monsterui.all import *
import json
from pathlib import Path
import datetime
from src.db import floorplans

# Initialize FastHTML ar with blue theme
ar = APIRouter()

# Serialization/deserialization functions
def serialize_floorplan(floorplan_data):
    """Serialize floorplan data for storage in database"""
    return json.dumps(floorplan_data.get("elements", []))

def deserialize_floorplan(db_floorplan):
    """Deserialize floorplan data from database"""
    return {
        "id": db_floorplan.id,
        "name": db_floorplan.name,
        "width": db_floorplan.width,
        "height": db_floorplan.height,
        "elements": json.loads(db_floorplan.data) if db_floorplan.data else []
    }

# Create a new floor plan
@ar.get("/create_floorplan")
def create_floorplan():
    return Card(
        CardHeader(H3("New Floor Plan")),
        CardBody(
            Form(
                LabelInput("Floor Plan Name", name="name", required=True),
                LabelInput("Width (meters)", name="width", type="number", value="20", min="5", max="100"),
                LabelInput("Height (meters)", name="height", type="number", value="15", min="5", max="100"),
                Button("Create", type="submit", hx_post=initialize_floorplan, hx_target="#main-content")
            )
        )
    )

# Initialize a floor plan
@ar.post("/initialize_floorplan")
def initialize_floorplan(name: str, width: float, height: float):
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
    return floorplan_editor(floorplan_id=floorplan.id)

# Load existing floor plans
@ar.get("/load_floorplan")
def load_floorplan():
    # Get list of floor plans from database
    db_floorplans = floorplans(where='user_id=?', where_args=(1,))
    if not db_floorplans:
        return Card(H3("No Floor Plans Found"),
            P("No existing floor plans found. Create a new one to get started."),
            Button("Create New", hx_get=create_floorplan, hx_target="#main-content"))
    
    return Card(
        CardHeader(H3("Load Floor Plan")),
        CardBody(
            Div(P("Select a floor plan to load:"),
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
    return Div(Card(H4("Properties"),
                Div(id="element-properties", cls="properties-panel"),
                cls=""),
            cls="")
def controls():
    return DivHStacked(
            Button("Save", On(code="saveChanges()",event="click")),
            Button("Export as PNG", id="export-png"),
            Button("Back to Home", hx_get='/', hx_target="#main-content"),
            Div(id="save-status", _="every 20s set .innerHTML to ''"),)
    
    
def tools():
    return Div(
            Card(
                H4("Tools"),
                DivVStacked(
                Button("Select", cls="", data_tool="select"),
                Button("Wall", cls="", data_tool="wall"),
                Button("Door (Standard)", cls="", data_tool="door-standard"),
                Button("Door (Emergency)", cls="", data_tool="door-emergency"),
                Button("Window", cls="", data_tool="window"),
                Button("Emergency Route", cls="", data_tool="emergency-route"),
                Button("Machine", cls="", data_tool="machine"),
                Button("Safety Closet", cls="", data_tool="closet"),
                Button("Delete", cls="", onclick="deleteSelectedElement()"),
                cls=""
            )),
            cls=""
        )
@ar.get('/floorplan_editor/{floorplan_id}')
def floorplan_editor(floorplan_id: int):
    # Load floor plan data from database
    try:
        floorplan = floorplans.fetchone(id=floorplan_id)
        if not floorplan:
            raise ValueError("Floorplan not found")
        print(type(floorplan.data))
        sf = deserialize_floorplan(floorplan)
        print(sf)
        # Deserialize floorplan data for use in the editor
        print(f'Floorplan has elements: {"\n".join(sf["elements"])}')
    except Exception as e:
        return Card(
            H3("Error"),
            P(f"Could not load floor plan: {str(e)}"),
            Button("Back to Home", hx_get='/', hx_target="#main-content")
        )

    
    
    return DivVStacked(
        # Left sidebar with tools
        # Bottom toolbar
        controls(),
        DivHStacked(
            tools(),
            editor(floorplan_id, floorplan.width, floorplan.height, floorplan.data),
            floorplan_properties(),
        ),
        cls="floorplan-editor",
        id="floorplan-editor-container",
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
        
        return Div("Floor plan saved successfully", cls="success-message", id='save-status', hx_swap_oob="true")
    except Exception as e:
        return Div(f"Error saving floor plan: {str(e)}", cls="error-message", id='save-status', hx_swap_oob="true")

# WebSocket handler for real-time collaboration
@ar.ws('/ws/floorplan/{floorplan_id}')
async def floorplan_ws(msg: str, send, floorplan_id: int):
    # Broadcast changes to all clients
    try:
        update = json.loads(msg)
        return Div(f"Element {update.get('id', 'unknown')} updated", id="update-message")
    except:
        return Div("Invalid update received", id="update-message")

