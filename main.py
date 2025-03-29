from fasthtml.common import *
from monsterui.all import *
import json
from pathlib import Path

# Create app directories if they don't exist
Path("data").mkdir(exist_ok=True)
Path("static").mkdir(exist_ok=True)
Path("static/js").mkdir(exist_ok=True)
Path("static/css").mkdir(exist_ok=True)

# Initialize FastHTML app with blue theme
app, rt = fast_app(
    hdrs=(
        Theme.blue.headers(),
        Link(rel="stylesheet", href="/static/css/floorplanner.css"),
        Script(src="/static/js/floorplanner.js"),
    ),
    # static_path="static"
)

# Home route
@rt
def index():
    return Titled(
        "Safety Floor Planner",
        NavBar(
            H3("Safety Floor Planner"),
            Button("New Floor Plan", hx_get=create_floorplan, hx_target="#main-content"),
            Button("Load Floor Plan", hx_get=load_floorplan, hx_target="#main-content"),
        ),
        Container(
            Div(
                Card(
                    H3("Welcome to Safety Floor Planner"),
                    P("Create and manage floor plans with safety-relevant elements"),
                    P("Use this tool to draw floor plans of your facility including:"),
                    Ul(
                        Li("Walls and room layouts"),
                        Li("Doors (red emergency exits and standard gray)"),
                        Li("Windows for ventilation and emergency access"),
                        Li("Machines (clickable with safety information)"),
                        Li("Safety closets for dangerous materials")
                    ),
                    Button("Start New Floor Plan", hx_get=create_floorplan, hx_target="#main-content")
                ),
                id="main-content"
            ),
            cls=("mt-5", "uk-container-xl")
        )
    )

# Create a new floor plan
@rt
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
@rt
def initialize_floorplan(name: str, width: float, height: float):
    floorplan_id = name.lower().replace(" ", "_")
    floorplan_data = {
        "id": floorplan_id,
        "name": name,
        "width": float(width),
        "height": float(height),
        "elements": []
    }
    
    # Save the floor plan data
    floorplan_path = Path(f"data/{floorplan_id}.json")
    with open(floorplan_path, "w") as f:
        json.dump(floorplan_data, f, indent=2)
    
    return floorplan_editor(floorplan_id=floorplan_id)

# Load existing floor plans
@rt
def load_floorplan():
    # Get list of floor plans from data directory
    floorplans = []
    for file in Path("data").glob("*.json"):
        try:
            with open(file) as f:
                data = json.load(f)
                floorplans.append({"id": data.get("id"), "name": data.get("name")})
        except:
            continue
    
    if not floorplans:
        return Card(
            H3("No Floor Plans Found"),
            P("No existing floor plans found. Create a new one to get started."),
            Button("Create New", hx_get=create_floorplan, hx_target="#main-content")
        )
    
    return Card(
        CardHeader(H3("Load Floor Plan")),
        CardBody(
            Div(
                P("Select a floor plan to load:"),
                Ul(*[Li(Button(plan["name"], hx_get=floorplan_editor.to(floorplan_id=plan["id"]), hx_target="#main-content")) for plan in floorplans]),
                cls="space-y-4"
            )
        )
    )

# Floor plan editor
@rt
def floorplan_editor(floorplan_id: str):
    # Load floor plan data
    try:
        with open(f"data/{floorplan_id}.json") as f:
            floorplan = json.load(f)
    except:
        return Card(
            H3("Error"),
            P("Could not load floor plan. It may have been deleted or corrupted."),
            Button("Back to Home", hx_get=index, hx_target="#main-content")
        )
    
    return Div(
        # Left sidebar with tools
        Div(
            Card(
                H4("Tools"),
                Button("Select", cls="tool-btn", data_tool="select"),
                Button("Wall", cls="tool-btn", data_tool="wall"),
                Button("Door (Standard)", cls="tool-btn", data_tool="door-standard"),
                Button("Door (Emergency)", cls="tool-btn", data_tool="door-emergency"),
                Button("Window", cls="tool-btn", data_tool="window"),
                Button("Machine", cls="tool-btn", data_tool="machine"),
                Button("Safety Closet", cls="tool-btn", data_tool="closet"),
                Button("Delete", cls="tool-btn", data_tool="delete"),
                cls="tool-sidebar"
            ),
            cls="tool-container"
        ),
        
        # Main canvas area
        Div(
            Div(
                # Canvas for the floor plan
                Canvas(
                    width=800, height=600, id="floorplan-canvas",
                    data_floorplan=floorplan_id,
                    data_width=floorplan["width"],
                    data_height=floorplan["height"]
                ),
                cls="canvas-container"
            ),
            cls="editor-main"
        ),
        
        # Right sidebar for properties
        Div(
            Card(
                H4("Properties"),
                Div(id="element-properties", cls="properties-panel"),
                cls="properties-sidebar"
            ),
            cls="properties-container"
        ),
        
        # Bottom toolbar
        Div(
            Button("Save", hx_post=save_floorplan.to(floorplan_id=floorplan_id), hx_target="#save-status"),
            Button("Export as PNG", id="export-png"),
            Button("Back to Home", hx_get=index, hx_target="#main-content"),
            Div(id="save-status"),
            cls="bottom-toolbar"
        ),
        
        cls="floorplan-editor",
        id="floorplan-editor-container",
        hx_ext="ws",
        ws_connect=f"/ws/floorplan/{floorplan_id}",
    )

# Save floor plan
@rt
def save_floorplan(floorplan_id: str, elements: str = "[]"):
    try:
        with open(f"data/{floorplan_id}.json") as f:
            floorplan = json.load(f)
        
        # Update elements
        floorplan["elements"] = json.loads(elements)
        
        # Save updated floor plan
        with open(f"data/{floorplan_id}.json", "w") as f:
            json.dump(floorplan, f, indent=2)
        
        return Div("Floor plan saved successfully", cls="success-message")
    except Exception as e:
        return Div(f"Error saving floor plan: {str(e)}", cls="error-message")

# WebSocket handler for real-time collaboration
@app.ws('/ws/floorplan/{floorplan_id}')
async def floorplan_ws(msg: str, send, floorplan_id: str):
    # Broadcast changes to all clients
    try:
        update = json.loads(msg)
        return Div(f"Element {update.get('id', 'unknown')} updated", id="update-message")
    except:
        return Div("Invalid update received", id="update-message")

# Start the server
serve()
