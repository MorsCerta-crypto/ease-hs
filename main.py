from fasthtml.common import *
from monsterui.all import *
from pathlib import Path
from src.floorplan import ar, floorplans
from datetime import datetime

# Initialize FastHTML app with blue theme
app, rt = fast_app(live=True,
    hdrs=(
        Theme.zinc.headers(),
        Link(rel="stylesheet", href="/static/css/floorplanner.css"),
    ),
)
ar.to_app(app)

# Home route
@app.get("/")
def index():
    # Get list of floor plans from database
    db_floorplans = floorplans(where='user_id=?', where_args=(1,))
    
    table_content = []
    if db_floorplans:
        for plan in db_floorplans:
            # Format the date
            updated_date = datetime.fromisoformat(plan.updated_at).strftime("%d.%m.%Y %H:%M")
            
            # Create row with actions
            table_content.append(Tr(
                Td(plan.name),
                Td(f"{plan.width}m × {plan.height}m"),
                Td(updated_date),
                Td(
                    A("Bearbeiten", href=f"/edit-floorplan/{plan.id}", cls=ButtonT.default),
                    A("Anzeigen", href=f"/show-floorplan/{plan.id}", cls=ButtonT.default),
                    Button("Löschen", hx_delete=f"/delete-floorplan/{plan.id}", cls=ButtonT.destructive)
                )
            ))
    
    floorplan_table = Table(
        Thead(Tr(
            Th("Name"),
            Th("Abmessungen"),
            Th("Zuletzt aktualisiert"),
            Th("Aktionen")
        )),
        Tbody(*table_content if table_content else [Tr(Td("Keine Grundrisse gefunden", colspan="4", cls="uk-text-center"))]),
        cls="uk-table uk-table-divider uk-table-hover"
    )
    
    return Titled(
        "Safety Floor Planner",
        NavBar(
            H3("Safety Floor Planner"),
            A("Neuer Grundriss", href="/create_floorplan", cls="uk-button uk-button-primary"),
        ),
        Container(
            Card(
                CardHeader(H3("Meine Grundrisse")),
                CardBody(floorplan_table),
                CardFooter(P("Klicken Sie auf 'Bearbeiten', um einen Grundriss zu ändern oder 'Anzeigen' für eine schreibgeschützte Ansicht."))
            ),
            cls=("mt-5", "uk-container-xl")
        )
    )

serve(reload=True)
