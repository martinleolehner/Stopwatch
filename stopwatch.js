/*
* A simple web browser based stopwatch.
* Copyright (C) 2015  Martin Lehner
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Variables and configuration
var stopwatches = [];

var concurrentWatches = false;	// Is it possible to run multiple watches at the same time?
var minuteFormat = false;	// true -> mmm:ss, false -> hh:mm:ss

var updateTime = 0.1;	// Update interval in seconds (0.1 recommended)
var updateInterval = null;

var saveTime = 10;	// Interval time in seconds to save all states (10 recommended)
var saveInterval = null;

var useLocalStorage = true;

var initialized = false;

var colorActive = "#97F578";	// Backgroundcolor for active stopwatches
var colorInactive = "#ffffff";	// Backgroundcolor for inactive stopwatches


// Saves the watches before closing
window.onbeforeunload = function()
{
	saveWatches();
	//return "Do you really want to leave this page?";
}

// Initializes the stopwatch
function init()
{
	useLocalStorage = localStorageAvailable();

	if(getData("timeFormat") == "minute") minuteFormat = true;
	document.getElementById("changeFormatCheckbox").checked = !minuteFormat;

	if(getData("concurrent") == "true") concurrentWatches = true;
	document.getElementById("changeConcurrentCheckbox").checked = concurrentWatches;

	initialized = true;

	try
	{
		var watches = JSON.parse(getData("stopwatches"));
		if(watches.length > 0)
		{
			for(var i=0; i<watches.length; i++)
			{
				newStopwatch(watches[i]);
			}
		}
		else {
			newStopwatch();
		}
	}
	catch (e)
	{
		removeAll();
	}

	updateWatches();
	updateTotalTime();

}

// Updates the total time
function updateTotalTime()
{
	if(!initialized) return;

	var totalTime = 0;
	for(var i=0; i<stopwatches.length; i++)
	{
		if(stopwatches[i]["time"] != -1) totalTime += stopwatches[i]["time"];
	}

	if(totalTimeSpan = document.getElementById("totalTime"))
	{
		totalTime = Math.round(totalTime/1000);
		totalTimeSpan.innerHTML = timeToFormattedString(totalTime);
	}
}

// Updates all stopwatches
function updateWatches()
{
	if (!initialized) return;

	var now = new Date().getTime();
	for(var i=0; i<stopwatches.length; i++)
	{
		var timeDiffrence = 0;
		if(stopwatches[i]["active"] == true) timeDiffrence = now - stopwatches[i]["startTime"];
		stopwatches[i]["time"] = stopwatches[i]["stoppedTime"] + timeDiffrence;
		writeTime(stopwatches[i]["id"]);
	}

	updateTotalTime();
}

// Saves all stopwatches
function saveWatches()
{
	if(!initialized) return;

	var watches = [];
	var now = new Date().getTime();

	for(var i=0; i<stopwatches.length; i++)
	{
		var timeDiffrence = 0;
		if(stopwatches[i]["active"] == true) timeDiffrence = now - stopwatches[i]["startTime"];
		watches.push({
			id: stopwatches[i]["id"],
			active: false,
			time: 0,
			stoppedTime: stopwatches[i]["stoppedTime"] + timeDiffrence,
			startTime: -1,
			title: stopwatches[i]["title"],
			description: stopwatches[i]["description"]});
	}
	setData("stopwatches", JSON.stringify(watches));
}

// Changes the setting to run multiple watches at the same time
function changeConcurrent(val)
{
	if(!initialized) return;

	if(val) concurrentWatches = true;
	else
	{
		concurrentWatches = false;

		// Get the number of active stopwatches
		var activeWatches = 0;
		for(var i=0; i<stopwatches.length; i++)
		{
			if(stopwatches[i]["active"])
			{
				++activeWatches;
			}
		}

		// Stop all watches except the last started if more than one watch is active
		if(activeWatches > 1)
		{
			var latest = 0;
			for(var i=0; i<stopwatches.length; i++)
			{
				if(stopwatches[i]["active"])
				{
					if(stopwatches[i]["startTime"] >= stopwatches[latest]["startTime"]) latest = i;
				}
			}

			for(var i=0; i<stopwatches.length; i++)
			{
				if(stopwatches[i]["active"] && i != latest) stopWatch(i);
			}
		}
	}

	setData("concurrent", concurrentWatches);
}

// Changes the format to minutes or hours
function changeFormat(val)
{
	if(!initialized) return;

	minuteFormat = !val;
	setData("timeFormat", (minuteFormat)? "minute" : "hour");
	updateWatches();
}

// Formats raw seconds to a readable string
function timeToFormattedString(totalSeconds)
{
	var seconds = totalSeconds%60;
	var minutes = (totalSeconds - seconds)/60;
	var timeString = "";

	if(minuteFormat)
	{
		timeString = ((minutes<10)? "0" : "") + minutes + ":" + ((seconds<10)? "0" : "") + seconds;
	}
	else
	{
		var hours = Math.floor(minutes/60);
		minutes = minutes%60;
		timeString = hours + ":" + ((minutes<10)? "0" : "") + minutes + ":" + ((seconds<10)? "0" : "") + seconds;
	}

	return timeString;
}

// Creates a new stopwatch
function newStopwatch(stopwatch)
{
	if (!initialized) return;

	// Push an existing watch to the array or create a new one
	if(typeof stopwatch == "object") stopwatches.push(stopwatch);
	else
	{
		var newId = 0;
		for(var i=0; i<stopwatches.length; i++)
		{
			if(stopwatches[i]["id"] >= newId) newId = stopwatches[i]["id"] + 1;
		}

		stopwatches.push({id: newId, active: false, time: 0, stoppedTime: 0, startTime: 0, title: "", description: ""});
	}

	var watchNumber = stopwatches.length - 1;
	var watchId = stopwatches[watchNumber]["id"];

	// Create the div
	var watchDiv = document.createElement("div");
	watchDiv.className = "stopwatch";
	watchDiv.id = "stopwatch" + watchId;
	watchDiv.innerHTML = '<input type="text" class="title" placeholder="Title" value="'+stopwatches[watchNumber]["title"]+'" onchange="saveTitle('+watchId+', this.value)">'
	+ '<br>'
	+ '<textarea class="description"  rows="2" cols="30" placeholder="Description" onchange="saveDescription('+watchId+', this.value)">'+stopwatches[watchNumber]["description"]+'</textarea>'
	+ '<p class="time">'+timeToFormattedString(0)+'</p>'
	+ '<input type="button" class="start" value="Start" onclick="startWatch('+watchId+');">'
	+ '<input type="button" class="stop" value="Stop" onclick="stopWatch('+watchId+');" disabled>'
	+ '<input type="button" class="reset" value="Reset" onclick="resetWatch('+watchId+');">'
	+ '<input type="button" class="remove" value="Remove" onclick="removeWatch('+watchId+');">';

	// Append the div
	if(watchesDiv = document.getElementById("stopwatches"))
	{
		watchesDiv.appendChild(watchDiv);
		if(typeof stopwatch != "object") watchDiv.getElementsByClassName("title")[0].focus();
	}
}

// Gets the array index from the id
function getWatchNumber(id)
{
	if(!initialized) return;

	for(var i=0; i<stopwatches.length; i++)
	{
		if(id == stopwatches[i]["id"]) return i;
	}

	return -1;
}

// Saves the title
function saveTitle(id, title)
{
	if(!initialized) return;

	var watchNumber = getWatchNumber(id);

	if(title != "") stopwatches[watchNumber]["title"] = title;
}

// Saves the description
function saveDescription(id, description)
{
	if(!initialized) return;

	var watchNumber = getWatchNumber(id);

	if(description != "") stopwatches[watchNumber]["description"] = description;
}

// Writes the time into a stopwatch
function writeTime(id)
{
	if(!initialized) return;

	var watchNumber = getWatchNumber(id);

	if(stopwatchDiv = document.getElementById("stopwatch" + id))
	{
		var totalSeconds = Math.round(stopwatches[watchNumber]["time"]/1000);

		stopwatchDiv.getElementsByClassName("time")[0].innerHTML = timeToFormattedString(totalSeconds);
	}
}

// Starts a stopwatch
function startWatch(id)
{
	if (!initialized) return;

	if(!concurrentWatches) stopAll();

	var watchNumber = getWatchNumber(id);

	stopwatches[watchNumber]["active"] = true;
	stopwatches[watchNumber]["startTime"] = new Date().getTime();

	// Set the update inverval if not yet active
	if(updateInterval == null)
	{
		updateInterval = setInterval(function(){ updateWatches() }, 1000*updateTime);
	}

	// Set the save interval if not yet active
	if(saveInterval == null)
	{
		saveInterval = setInterval(function(){ saveWatches() }, 1000*saveTime);
	}

	// Update the watch's view
	if(watchDiv = document.getElementById("stopwatch"+id))
	{
		watchDiv.getElementsByClassName("start")[0].disabled = true;
		watchDiv.getElementsByClassName("stop")[0].disabled = false;
		watchDiv.className = "stopwatch active";
	}
}

// Stops a watch
function stopWatch(id)
{
	if (!initialized) return;

	var watchNumber = getWatchNumber(id);

	if(!stopwatches[watchNumber]["active"]) return;

	stopwatches[watchNumber]["active"] = false;
	stopwatches[watchNumber]["stoppedTime"] = stopwatches[watchNumber]["time"];

	var allWatchesStopped = true;
	for(var i=0; i<stopwatches.length; i++)
	{
		if(stopwatches[i]["active"] == true) allWatchesStopped = false;
	}

	// Clear the update and save interval if all watches are stopped
	if(allWatchesStopped)
	{
		clearInterval(updateInterval);
		updateInterval = null;

		clearInterval(saveInterval);
		saveInterval = null;
	}

	// Update the watch's view
	if(watchDiv = document.getElementById("stopwatch"+id))
	{
		watchDiv.getElementsByClassName("start")[0].disabled = false;
		watchDiv.getElementsByClassName("stop")[0].disabled = true;
		watchDiv.className = "stopwatch";
	}
}

// Resets a watch
function resetWatch(id)
{
	if (!initialized) return;

	stopWatch(id);

	var watchNumber = getWatchNumber(id);

	stopwatches[watchNumber]["time"] = 0;
	stopwatches[watchNumber]["stoppedTime"] = 0;

	writeTime(id);
}

// Stops and removes a watch
function removeWatch(id)
{
	if (!initialized) return;

	stopWatch(id);

	if(watchDiv = document.getElementById("stopwatch"+id))
	{
		watchDiv.parentElement.removeChild(watchDiv);
	}

	var watchNumber = getWatchNumber(id);

	stopwatches.splice(watchNumber, 1);

	updateTotalTime();

}

// Stops all watches
function stopAll()
{
	if (!initialized) return;

	for(var i=0; i<stopwatches.length; i++)
	{
		if(stopwatches[i]["active"] == true)
		{
			stopWatch(stopwatches[i]["id"]);
		}
	}
}

// Removes all stopwatches and adds one new stopwatch
function removeAll()
{
	if (!initialized) return;

	stopAll();

	for(var i=0; i<stopwatches.length; i++)
	{
		if(watchDiv = document.getElementById("stopwatch"+stopwatches[i]["id"]))
		{
			watchDiv.parentElement.removeChild(watchDiv);
		}
	}

	stopwatches = [];

	newStopwatch();

	updateTotalTime();
}

// Checks if local storage is available
function localStorageAvailable()
{
	var x = "CheckForLocalStorage";
	try
	{
		localStorage.setItem(x, x);
		localStorage.removeItem(x);
		return true;    // If setting and removing an item succeeds, local storage is available
	}
	catch(e)
	{
		return false;   // If an exception is catched, local storage isn't available
	}
}

// Sets a cookie or a local storage item
function setData(name, value, days)
{
	if(useLocalStorage) localStorage.setItem(name, value);  // Set a local storage item
	else
	{
		if(typeof days == undefined) days = 365;    // Default value for expiration date
		var d = new Date();
		d.setTime(d.getTime() + days*24*60*60*1000);
		var ms = "expires=" + d.toUTCString();
		document.cookie = name + "=" + value + "; " + ms;   // Set the cookie
	}

}

// Gets a cookie or a local storage item
function getData(name)
{
	if(useLocalStorage) return localStorage.getItem(name);  // Get the local storage item
	else
	{
		var a = document.cookie.split(";");
		for(var i=0; i<a.length; i++)
		{
			var x = a[i];
			x.trim();
			if(x.indexOf(name+"=") == 0) return x.substring(name.length + 1);   // Get the cookie
		}
	}
	return null;
}
