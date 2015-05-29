package co.mylonas.cordova.mediacontroller;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import android.content.Context;
import android.content.Intent;
import android.view.KeyEvent;
import org.json.JSONException;
import org.json.JSONArray;
import java.util.Hashtable;
import java.util.logging.Logger;


public class MediaController extends CordovaPlugin {
	
	private final Logger log = Logger.getLogger( this.getClass().getName() );
	private final Hashtable<String, Integer> methods = new Hashtable<String, Integer>() {{
		put("next", KeyEvent.KEYCODE_MEDIA_NEXT);
		put("previous", KeyEvent.KEYCODE_MEDIA_PREVIOUS);
		put("pause", KeyEvent.KEYCODE_MEDIA_PAUSE);
		put("play", KeyEvent.KEYCODE_MEDIA_PLAY);
		put("stop", KeyEvent.KEYCODE_MEDIA_STOP);
	}};
	
	public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        log.info("Executing action: " + action);
		
		callbackContext.sendPluginResult(controlMedia(action));
		return true;
    }
	
	public PluginResult controlMedia(String method) {
		try {
			Intent i = new Intent(Intent.ACTION_MEDIA_BUTTON);
			
			synchronized (this) {
				i.putExtra(Intent.EXTRA_KEY_EVENT, new KeyEvent(KeyEvent.ACTION_DOWN, methods.get(method)));
				this.cordova.getActivity().getApplicationContext().sendOrderedBroadcast(i, null);
				i.putExtra(Intent.EXTRA_KEY_EVENT, new KeyEvent(KeyEvent.ACTION_UP, methods.get(method)));
				this.cordova.getActivity().getApplicationContext().sendOrderedBroadcast(i, null);
			 }
		} catch (Exception ex) {
			return new PluginResult(PluginResult.Status.ERROR, ex.getMessage());
		}
		return new PluginResult(PluginResult.Status.OK, method);
	}
	
}