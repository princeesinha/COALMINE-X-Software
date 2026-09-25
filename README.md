# COALMINE-X Dashboard

## Mine Safety Monitoring Dashboard

This dashboard is a front-end simulation for the COALMINE-X mine safety system.

### UGV R-01 live camera behavior
- The live night-vision feed stays OFF while R-01 is outside the mine.
- When the UGV enters the mine, the Zone A patrol feed becomes LIVE.
- The feed remains active while the rover patrols Zone A, deploys the sensor device, and returns to the portal.
- When R-01 reaches the outside/portal state, the live camera and media transfer automatically switch OFF.
- The **Reset Mission** button returns the UGV mission state to **Waiting at portal** and turns the live feed OFF.

### Zone A safety status
The dashboard calculates the displayed situation from the current simulated conditions:
- **SAFE** – normal/stable condition.
- **SMALL RISK** – elevated but not critical condition.
- **HIGH RISK** – critical structural/safety condition.

### Alerts and notifications
The dashboard can show alerts for:
- Risky-zone discovery / elevated Zone A risk.
- Crack detection.
- PU-foam activity.
- Blasting/seismic events.
- Critical conditions can also activate the dashboard siren.

### Hardware boundary
UGV movement/control remains part of the external hardware simulation. The dashboard monitors and visualizes the received state, sensor readings, safety analytics, alerts, and media.

### Run
Use `START_DASHBOARD.bat` on Windows or `start-dashboard.sh` on Linux/macOS-compatible environments.


## Authorized Substation Login
- The dashboard opens with an SS-1 Substation login screen.
- Only the configured authorized SS-1 operator profile can enter the demo console.
- Operator identity is shown in the sidebar and can be signed out.
- This is a front-end demonstration login, not production authentication.

## R-01 mission and camera
- The live camera turns on when R-01 enters the mine and stays active during Zone A patrol, sensor deployment, and the return journey.
- The night-vision camera position advances through the mine so the feed visually moves forward and passes detected cracks.
- The feed displays a recording indicator, mission phase, chainage, methane and crack/foam evidence.
- Camera/media transmission stops automatically after R-01 returns to the portal.
- The Reset Mission and Reset System controls can replay the mission.

## Notification rules
- High-risk Zone A conditions and blasting/seismic events generate safety alerts.
- Small crack detection and PU-foaming generate operator notifications.
- Zone A continuously changes between SAFE, SMALL RISK and HIGH RISK according to the simulated structural/sensor state.
