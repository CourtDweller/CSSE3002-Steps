package co.mylonas.cordova.timepicker;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import android.content.Context;
import android.app.TimePickerDialog;
import android.app.Dialog;
import android.view.View;
import org.json.JSONException;
import org.json.JSONArray;

import java.util.logging.Logger;


public class TimePicker extends CordovaPlugin {
	
	private final Logger log = Logger.getLogger( this.getClass().getName() );
	private TimePickerDialog.OnTimeSetListener mTimeSetListener = new TimePickerDialog.OnTimeSetListener() {
		public void onTimeSet(android.widget.TimePicker view, int hourOfDay, int minute) {
			cordovaCallbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, "{\"hour\": "+hourOfDay+", \"minute\": "+minute+"}"));
		}
	};
	private CallbackContext cordovaCallbackContext;
	
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

		cordovaCallbackContext = callbackContext;
		log.info("Executing action: " + action);
		
		if (action.equals("show")) {
			showTimePicker();
			return true;
		}
		
		callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "Invalid action"));
        return false;
    }
	
	public void showTimePicker() {
		try {
			new TimePickerDialog(this.cordova.getActivity(), mTimeSetListener, 0, 0, false).show();
		} catch (Exception e) {
			e.printStackTrace();
			cordovaCallbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "Unable to show TimePicker"));
		}
	}
	
	
}