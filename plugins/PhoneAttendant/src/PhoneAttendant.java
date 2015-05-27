package co.mylonas.cordova.phoneattendant;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import android.content.Context;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;

import android.os.Binder;
import android.os.IBinder;
import java.lang.reflect.Method;

import org.json.JSONException;
import org.json.JSONArray;

import java.util.logging.Logger;


public class PhoneAttendant extends CordovaPlugin {
	
	private final Logger log = Logger.getLogger( this.getClass().getName() );
	
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        log.info("Executing action: " + action);
		
		if (action.equals("declineCall")) {
			declineCall();
			callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, ""));
			return true;
		}
		
		callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.ERROR, "Invalid action"));
        return false;
    }
	
	public PluginResult declineCall() {
		try {

			String serviceManagerName = "android.os.ServiceManager";
			String serviceManagerNativeName = "android.os.ServiceManagerNative";
			String telephonyName = "com.android.internal.telephony.ITelephony";
			Class<?> telephonyClass;
			Class<?> telephonyStubClass;
			Class<?> serviceManagerClass;
			Class<?> serviceManagerNativeClass;
			Method telephonyEndCall;
			Object telephonyObject;
			Object serviceManagerObject;
			telephonyClass = Class.forName(telephonyName);
			telephonyStubClass = telephonyClass.getClasses()[0];
			serviceManagerClass = Class.forName(serviceManagerName);
			serviceManagerNativeClass = Class.forName(serviceManagerNativeName);
			Method getService =
					serviceManagerClass.getMethod("getService", String.class);
			Method tempInterfaceMethod = serviceManagerNativeClass.getMethod(
					"asInterface", IBinder.class);
			Binder tmpBinder = new Binder();
			tmpBinder.attachInterface(null, "fake");
			serviceManagerObject = tempInterfaceMethod.invoke(null, tmpBinder);
			IBinder retbinder = (IBinder) getService.invoke(
					serviceManagerObject, "phone");
			Method serviceMethod = telephonyStubClass.getMethod("asInterface",
					IBinder.class);
			telephonyObject = serviceMethod.invoke(null, retbinder);
			telephonyEndCall = telephonyClass.getMethod("endCall");
			telephonyEndCall.invoke(telephonyObject);
			
			return new PluginResult(PluginResult.Status.ERROR, "Invalid action");
		} catch (Exception e) {
			e.printStackTrace();
			return new PluginResult(PluginResult.Status.ERROR, "Unable to Block Call");
		}
	}
}