// The call push task has to exist before anything else runs: when a call push wakes a
// closed Android app, Android starts this bundle just to run it (see utils/callPushTask).
import "./src/utils/callPushTask";
import "expo-router/entry";
