package co.mylonas.cordova.alarmclock;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import android.content.Context;
import android.content.Intent;
import android.app.PendingIntent;
import android.app.AlarmManager;

import org.json.JSONException;
import org.json.JSONArray;

import java.util.logging.Logger;


public class AlarmClock extends CordovaPlugin {
	
	private final Logger log = Logger.getLogger( this.getClass().getName() );
	
	AlarmManager alarmManager;
	private PendingIntent pendingIntent;
	
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        log.info("Executing action: " + action);
		
		if (action.equals("setAlarm")) {
			cancelAlarms();
			Intent myIntent = new Intent(this.cordova.getActivity().getApplicationContext(), AlarmReceiver.class);
            pendingIntent = android.app.PendingIntent.getBroadcast(this.cordova.getActivity().getApplicationContext(), 0, myIntent, 0);
			
			log.info("Pending Intent: " + pendingIntent.toString());		
					
			alarmManager = (AlarmManager) this.cordova.getActivity().getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);
			//Long l = Long.parseLong("1432875600000");
			
			Long l = System.currentTimeMillis();
			//log.info("Current System Time: " + String.valueOf(l));
			l += 5000;
			//log.info("New Alarm Time: " + String.valueOf(l));
			
			alarmManager.setExact(AlarmManager.RTC_WAKEUP, l, pendingIntent);
			
			//log.info("Next Alarm: " + String.valueOf(alarmManager.getNextAlarmClock().getTriggerTime()));
			
			
			callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, ""));
			return true;
		} else if (action.equals("cancel")) {
			cancelAlarms();
		}
				
		
		callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "Invalid action"));
        return false;
    }
	
	public void cancelAlarms() {
		alarmManager = (AlarmManager) this.cordova.getActivity().getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);
		alarmManager.cancel(pendingIntent);
	}
	
	public void setAlarmText(String alarmText) {
        log.info("SETTING ALARM TEXT: " + alarmText);
    }
}