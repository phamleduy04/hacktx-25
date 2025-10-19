interface PitStopRequest {
  undercut_overcut_opportunity: number;
  tire_wear_percentage: number;
  performance_drop_seconds: number;
  track_position: number;
  race_incident: string;
  laps_since_pit: number;
}

interface PitStopResponse {
  decision: "PIT NOW" | "STAY OUT";
  confidence: number;
  status: string;
  input_data: PitStopRequest;
}

/**
 * Call the pit stop prediction API to get AI-driven pit stop decision
 */
export async function getPitStopDecision(data: PitStopRequest): Promise<PitStopResponse> {
  try {
    const response = await fetch('http://129.212.190.236:3000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Map the API response to our expected format
    return {
      decision: result.decision === "PIT NOW" ? "PIT NOW" : "STAY OUT",
      confidence: result.confidence || 0,
      status: result.status || "error",
      input_data: result.input_data || data
    };
  } catch (error) {
    console.error('Pit stop API call failed:', error);
    
    // Return safe default on error
    return {
      decision: "STAY OUT",
      confidence: 0,
      status: "error",
      input_data: data
    };
  }
}
