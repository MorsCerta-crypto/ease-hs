from fasthtml.common import *
from monsterui.all import *
from pathlib import Path
from src.floorplan import create_floorplan, load_floorplan, ar

# Initialize FastHTML app with blue theme
app, rt = fast_app(live=True,
    hdrs=(
        Theme.blue.headers(),
        Link(rel="stylesheet", href="/static/css/floorplanner.css"),
        # Import JavaScript modules in the correct order
        Script(src="/static/js/main.js", type="module"),
    ),
    # static_path="static"
)
ar.to_app(app)
# Home route
@app.get("/")
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

serve(reload=True)
