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

// Configuration
var colorActive = "#97F578";  // Backgroundcolor for active stopwatches
var colorInactive = "#ffffff";  // Backgroundcolor for inactive stopwatches

var stopwatches = [];
var concurrentWatches = false;  // Is it possible to run multiple watches at the same time?

var intervalTime = 0.1;  // Update interval in seconds (0.1 recommended)
var interval = null;

var useLocalStorage = true;
var initialized = false;

var minuteFormat = false;  // true -> mmm:ss, false -> hh:mm:ss

window.onbeforeunload = function(){ return "If you leave this page, all states get lost."; }

function init(){
	useLocalStorage = localStorageAvailable();
	if(getData("timeFormat") == "minute") minuteFormat = true;
	document.getElementById("changeFormatCheckbox").checked = !minuteFormat;
	updateTotalTime();

	if(getData("concurrent") == "true") concurrentWatches = true;
	document.getElementById("changeConcurrentCheckbox").checked = concurrentWatches;

	initialized = true;
	newStopwatch();
}

function changeConcurrent(val)
{
	if(val) concurrentWatches = true;
	else
	{
		concurrentWatches = false;

		var activeWatches = 0;
		for(var i=0; i<stopwatches.length; i++)
		{
			if(stopwatches[i]["active"])
			{
				++activeWatches;
			}
		}

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
				if(stopwatches[i]["active"] && i != latest) stop(i);
			}
		}
	}

	setData("concurrent", concurrentWatches);
}

function newStopwatch(){
	if (!initialized) return;

	stopwatches.push({active: false, time: 0, stoppedTime: 0, startTime: 0});
	var watchNumber = stopwatches.length - 1;

	var watchDiv = document.createElement("div");
	watchDiv.className = "stopwatch";
	watchDiv.id = "stopwatch" + watchNumber;
	watchDiv.innerHTML = '<input type="text" class="title" placeholder="Title"><br>'
	+ '<textarea class="description"  rows="2" cols="30" placeholder="Description"></textarea>'
	+ '<p class="time">'+timeToFormattedString(0)+'</p>'
	+ '<input type="button" class="start" value="Start" onclick="start('+watchNumber+');">'
	+ '<input type="button" class="stop" value="Stop" onclick="stop('+watchNumber+');" disabled>'
	+ '<input type="button" class="reset" value="Reset" onclick="reset('+watchNumber+');">'
	+ '<input type="button" class="remove" value="Remove" onclick="removeWatch('+watchNumber+');">';

	if(watchesDiv = document.getElementById("stopwatches")){
		watchesDiv.appendChild(watchDiv);
		watchDiv.getElementsByClassName("title")[0].focus();
	}
}

function update(){
	if (!initialized) return;

	var now = new Date().getTime();
	for(var i=0; i<stopwatches.length; i++){
		if(stopwatches[i]["active"] == true){
			var timeDiffrence = now - stopwatches[i]["startTime"];
			stopwatches[i]["time"] = stopwatches[i]["stoppedTime"] + timeDiffrence;
		}
		writeTime(i);
	}

	updateTotalTime();
}

function updateTotalTime(){
	var totalTime = 0;
	for(var i=0; i<stopwatches.length; i++){
		if(stopwatches[i]["time"] != -1) totalTime += stopwatches[i]["time"];
	}

	if(totalTimeSpan = document.getElementById("totalTime")){
		totalTime = Math.round(totalTime/1000);
		totalTimeSpan.innerHTML = timeToFormattedString(totalTime);
	}
}

function changeFormat(val)
{
	minuteFormat = !val;
	setData("timeFormat", (minuteFormat)? "minute" : "hour");
	update();
}

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

function writeTime(watchNumber){
	if(stopwatchDiv = document.getElementById("stopwatch" + watchNumber)){
		var totalSeconds = Math.round(stopwatches[watchNumber]["time"]/1000);

		stopwatchDiv.getElementsByClassName("time")[0].innerHTML = timeToFormattedString(totalSeconds);
	}
}

function start(watchNumber){
	if (!initialized) return;

	if(!concurrentWatches) stopAll();

	stopwatches[watchNumber]["active"] = true;
	stopwatches[watchNumber]["startTime"] = new Date().getTime();

	if(interval == null){
		interval = setInterval(function(){update()},1000*intervalTime);
	}

	if(watchDiv = document.getElementById("stopwatch"+watchNumber)){
		watchDiv.getElementsByClassName("start")[0].disabled = true;
		watchDiv.getElementsByClassName("stop")[0].disabled = false;
		watchDiv.className = "stopwatch active";
	}
}

function stop(watchNumber){
	if (!initialized) return;

	if(!stopwatches[watchNumber]["active"]) return;

	stopwatches[watchNumber]["active"] = false;
	stopwatches[watchNumber]["stoppedTime"] = stopwatches[watchNumber]["time"];

	var allWatchesStopped = true;
	var i = 0;
	for(i=0; i<stopwatches.length; i++){
		if(stopwatches[i]["active"] == true){
			allWatchesStopped = false;
		}
	}
	if(allWatchesStopped){
		clearInterval(interval);
		interval = null;
	}

	if(watchDiv = document.getElementById("stopwatch"+watchNumber)){
		watchDiv.getElementsByClassName("start")[0].disabled = false;
		watchDiv.getElementsByClassName("stop")[0].disabled = true;
		watchDiv.className = "stopwatch";
	}
}

function stopAll(){
	if (!initialized) return;

	for(var i=0; i<stopwatches.length; i++){
		if(stopwatches[i]["active"] == true){
			stop(i);
		}
	}
}

function reset(watchNumber){
	if (!initialized) return;

	stop(watchNumber);

	stopwatches[watchNumber]["time"] = 0;
	stopwatches[watchNumber]["stoppedTime"] = 0;

	writeTime(watchNumber);
}

function removeWatch(watchNumber){
	if (!initialized) return;

	stop(watchNumber);

	if(watchDiv = document.getElementById("stopwatch"+watchNumber)){
		watchDiv.parentElement.removeChild(watchDiv);
	}

	stopwatches[watchNumber]["time"] = -1;

	updateTotalTime();

}

// Check if local storage is available
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

// Sets a cookie or local storage
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

// Gets a cookie or local storage
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
