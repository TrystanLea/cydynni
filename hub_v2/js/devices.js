var devices = {};
var inputs = {};
var nodes = {};
var nodes_display = {};
var selected_inputs = {};
var selected_device = false;
var device_templates = {};
var updater;

var basepath = "http://cydynni.local/emoncms";

function device_load()
{
    

    $.ajax({ url: basepath+"/device/template/listshort.json", dataType: 'json', async: true, success: function(data) { 
        device_templates = data; 
        update();
    }});

    //updaterStart(update, 5000);
}

function updaterStart(func, interval){
	  clearInterval(updater);
	  updater = null;
	  if (interval > 0) updater = setInterval(func, interval);
}

// ---------------------------------------------------------------------------------------------
// Fetch device and input lists
// ---------------------------------------------------------------------------------------------

function update(){

    // Join and include device data
    $.ajax({ url: basepath+"/device/list.json", dataType: 'json', async: true, success: function(data) {
        
        // Associative array of devices by nodeid
        devices = {};
        for (var z in data) devices[data[z].nodeid] = data[z];
        
        var requestTime = (new Date()).getTime();
        $.ajax({ url: basepath+"/input/list.json", dataType: 'json', async: true, success: function(data, textStatus, xhr) {
            table.timeServerLocalOffset = requestTime-(new Date(xhr.getResponseHeader('Date'))).getTime(); // Offset in ms from local to server time
	          
	          // Associative array of inputs by id
            inputs = {};
	          for (var z in data) inputs[data[z].id] = data[z];
	          
	          // Assign inputs to devices
	          for (var z in inputs) {
	              // Device does not exist which means this is likely a new system or that the device was deleted
	              // There needs to be a corresponding device for every node and so the system needs to recreate the device here
	              if (devices[inputs[z].nodeid]==undefined) {
	                  devices[inputs[z].nodeid] = {description:""};
	                  // Device creation
	                  $.ajax({ url: basepath+"/device/create.json?nodeid="+inputs[z].nodeid, dataType: 'json', async: true, success: function(data) {
	                      if (!data) alert("There was an error creating device: "+inputs[z].nodeid); 
	                  }});
	              }
	              if (nodes_display[inputs[z].nodeid]==undefined) nodes_display[inputs[z].nodeid] = false;
	              if (devices[inputs[z].nodeid].inputs==undefined) devices[inputs[z].nodeid].inputs = [];
	              devices[inputs[z].nodeid].inputs.push(inputs[z]);
	          }
	          
	          draw_devices();
        }});
    }});
}

// ---------------------------------------------------------------------------------------------
// Draw devices
// ---------------------------------------------------------------------------------------------
function draw_devices()
{
    // Draw node/input list
    var out = "";
    for (var node in devices) {
        // Control node
        var control_node = false;
        if (device_templates[node]!=undefined && device_templates[node].control) control_node = true;
    
        var visible = "hide"; if (nodes_display[node]) visible = "";
        
        out += "<div class='node'>";
        out += "  <div class='node-info' node='"+node+"'>";
        out += "    <div class='device-name'>"+node+":</div>";
        out += "    <div class='device-description'>"+devices[node].description+"</div>";
        // out += "    <div class='device-configure'>CONFIG</div>";
        // out += "    <div class='device-key'><i class='icon-lock icon-white'></i></div>"; 
        // out += "    <div class='device-schedule'>SCHEDULE</div>";
        out += "  </div>";
        
        if (!control_node) {
            out += "<div class='node-inputs "+visible+"' node='"+node+"'>";
            
            for (var i in devices[node].inputs) {
                var input = devices[node].inputs[i];
                
                var selected = "";
                if (selected_inputs[input.id]!=undefined && selected_inputs[input.id]==true) 
                    selected = "checked";
                
                out += "<div class='node-input' id="+input.id+">";
                out += "<div class='select'><div class='ipad'><input class='input-select' type='checkbox' id='"+input.id+"' "+selected+" /></div></div>";
                out += "<div class='name'><div class='ipad'>"+input.name+"</div></div>";
                
                // if (processlist_ui != undefined)  out += "<div class='processlist'><div class='ipad'>"+processlist_ui.drawpreview(input.processList)+"</div></div>";
                
                out += "<div class='node-input-right'>";
                out += "<div class='time'>"+list_format_updated(input.time)+"</div>";
                out += "<div class='value'>"+list_format_value(input.value)+"</div>";
                out += "<div class='configure' id='"+input.id+"'><i class='icon-wrench'></i></div>";
                out += "</div>";
                out += "</div>";
            }
            
            out += "</div>";
        } else {
            out += "<div class='node-scheduler hide' node='"+node+"'></div>";
        }
        out += "</div>";
       

    }
    $("#table").html(out);

    $('#input-loader').hide();
    if (out=="") {
        $("#noinputs").show();
        $("#apihelphead").hide();
    } else {
        $("#noinputs").hide();
        $("#apihelphead").show();
    }

    for (var node in devices) {
        if (device_templates[node]!=undefined && device_templates[node].control) {
            $(".node-info[node='"+node+"'] .device-schedule").show();
        }
    }
    
    autowidth(".node-inputs .name",10);
    autowidth(".node-inputs .value",10);
    resize();
}
// ---------------------------------------------------------------------------------------------

function autowidth(element,padding) {
    var mw = 0;
    $(element).each(function(){
        var w = $(this).width();
        if (w>mw) mw = w;
    });
    
    $(element).width(mw+padding);
    return mw;
}

// Show/hide node on click
$("#table").on("click",".node-info",function() {
    var node = $(this).attr('node');
    if (nodes_display[node]) {
        nodes_display[node] = false;
    } else {
        nodes_display[node] = true;
    }

    draw_devices();
    
    if (device_templates[node]!=undefined && device_templates[node].control) {
        if (nodes_display[node]) draw_scheduler(node);
    }
});

$("#table").on("click",".input-select",function(e) {
    input_selection();
});

$("#input-selection").change(function(){
    var selection = $(this).val();
    
    if (selection=="all") {
        for (var id in inputs) selected_inputs[id] = true;
        $(".input-select").prop('checked', true); 
        
    } else if (selection=="none") {
        selected_inputs = {};
        $(".input-select").prop('checked', false); 
    }
    input_selection();
});
  
function input_selection() 
{
    selected_inputs = {};
    var num_selected = 0;
    $(".input-select").each(function(){
        var id = $(this).attr("id");
        selected_inputs[id] = $(this)[0].checked;
        if (selected_inputs[id]==true) num_selected += 1;
    });

    if (num_selected>0) {
        $(".input-delete").show();
    } else {
        $(".input-delete").hide();
    }

    if (num_selected==1) {
        // $(".feed-edit").show();	  
    } else {
        // $(".feed-edit").hide();
    }
}

function draw_scheduler(node) 
{   
    var out = "";
    
    out += '<div class="scheduler-inner">';
    out +=     '<div class="scheduler-devicename"></div>';
    out +=     '<div class="scheduler-controls"></div>';

    out +=     '<button class="scheduler-save btn">Save</button>';
    out +=     '<br><br>';
    out +=     '<p><b>Schedule Output:</b><div id="schedule-output"></div></p>';
        
    out +=     '<div id="placeholder_bound" style="width:100%; height:300px;">';
    out +=       '<div id="placeholder" style="height:300px"></div>';
    out +=     '</div>';
        
    out +=     'Higher bar height equalls more power available';
    out += '</div>';
    
    $(".node-scheduler[node='"+node+"']").html(out);
    $(".node-scheduler[node='"+node+"']").show();
    scheduler_load(node);
}

$("#table").on("click",".device-key",function(e) {
    e.stopPropagation();
    var node = $(this).parent().attr("node");
    $(".node-info[node='"+node+"'] .device-key").html(devices[node].devicekey);    
});

$("#table").on("click",".device-schedule",function(e) {
    e.stopPropagation();
    var node = $(this).parent().attr("node");
    draw_scheduler(node);
});

$("#table").on("click",".device-configure",function(e) {
    e.stopPropagation();

    // Get device of clicked node
    var device = devices[$(this).parent().attr("node")];
	device_dialog.loadConfig(device_templates, device);
});

$(".input-delete").click(function(){
	  $('#inputDeleteModal').modal('show');
	  var out = "";
	  var ids = [];
	  for (var inputid in selected_inputs) {
		    if (selected_inputs[inputid]==true) {
			      var i = inputs[inputid];
			      if (i.processList == "" && i.description == "" && (parseInt(i.time) + (60*15)) < ((new Date).getTime() / 1000)){
				        // delete now if has no values and updated +15m
				        // ids.push(parseInt(inputid)); 
				        out += i.nodeid+":"+i.name+"<br>";
			      } else {
				        out += i.nodeid+":"+i.name+"<br>";		
			      }
		    }
	  }
	  
	  input.delete_multiple(ids);
	  update();
	  $("#inputs-to-delete").html(out);
});
  
$("#inputDelete-confirm").off('click').on('click', function(){
    var ids = [];
	  for (var inputid in selected_inputs) {
		    if (selected_inputs[inputid]==true) ids.push(parseInt(inputid));
	  }
	  input.delete_multiple(ids);
	  update();
	  $('#inputDeleteModal').modal('hide');
});

/* 
// Process list UI js
processlist_ui.init(0); // Set input context

$("#table").on('click', '.configure', function() {
    var i = inputs[$(this).attr('id')];
    console.log(i);
    var contextid = i.id; // Current Input ID
    // Input name
    var newfeedname = "";
    var contextname = "";
    if (i.description != "") { 
	      newfeedname = i.description;
	      contextname = "Node " + i.nodeid + " : " + newfeedname;
    }
    else { 
	      newfeedname = "node:" + i.nodeid+":" + i.name;
	      contextname = "Node " + i.nodeid + " : " + i.name;
    }
    var newfeedtag = "Node " + i.nodeid;
    var processlist = processlist_ui.decode(i.processList); // Input process list
    processlist_ui.load(contextid,processlist,contextname,newfeedname,newfeedtag); // load configs
});

$("#save-processlist").click(function (){
    var result = input.set_process(processlist_ui.contextid,processlist_ui.encode(processlist_ui.contextprocesslist));
    if (result.success) { processlist_ui.saved(table); } else { alert('ERROR: Could not save processlist. '+result.message); }
});

*/

// -------------------------------------------------------------------------------------------------------
// Device authentication transfer
// -------------------------------------------------------------------------------------------------------
auth_check();
setInterval(auth_check,5000);
function auth_check(){
    $.ajax({ url: basepath+"/device/auth/check.json", dataType: 'json', async: true, success: function(data) {
        if (data!="no devices") {
            $("#auth-check").show();
            $("#auth-check-ip").html(data.ip);
        } else {
            $("#auth-check").hide();
        }
    }});
}

$(".auth-check-allow").click(function(){
    var ip = $("#auth-check-ip").html();
    $.ajax({ url: basepath+"/device/auth/allow.json?ip="+ip, dataType: 'json', async: true, success: function(data) {
        $("#auth-check").hide();
    }});
});

// -------------------------------------------------------------------------------------------------------
// Interface responsive
//
// The following implements the showing and hiding of the device fields depending on the available width
// of the container and the width of the individual fields themselves. It implements a level of responsivness
// that is one step more advanced than is possible using css alone.
// -------------------------------------------------------------------------------------------------------
var show_processlist = true;
var show_select = true;
var show_time = true;
var show_value = true;

$(window).resize(function(){ resize(); });

function resize() 
{
    show_processlist = true;
    show_select = true;
    show_time = true;
    show_value = true;

    $(".node-input").each(function(){
         var node_input_width = $(this).width();
         if (node_input_width>0) {
             var w = node_input_width-10;
             
             var tw = 0;
             tw += $(this).find(".name").width();
             tw += $(this).find(".configure").width();

             tw += $(this).find(".select").width();
             if (tw>w) show_select = false;
             
             tw += $(this).find(".value").width();
             if (tw>w) show_value = false;
             
             tw += $(this).find(".time").width();
             if (tw>w) show_time = false;   
                
             tw += $(this).find(".processlist").width();
             if (tw>w) show_processlist = false;
         }
    });
    
    if (show_select) $(".select").show(); else $(".select").hide();
    if (show_time) $(".time").show(); else $(".time").hide();
    if (show_value) $(".value").show(); else $(".value").hide();
    if (show_processlist) $(".processlist").show(); else $(".processlist").hide();
    
}

// Calculate and color updated time
function list_format_updated(time) {
  time = time * 1000;
  var servertime = (new Date()).getTime() - table.timeServerLocalOffset;
  var update = (new Date(time)).getTime();

  var secs = (servertime-update)/1000;
  var mins = secs/60;
  var hour = secs/3600;
  var day = hour/24;

  var updated = secs.toFixed(0) + "s";
  if ((update == 0) || (!$.isNumeric(secs))) updated = "n/a";
  else if (secs< 0) updated = secs.toFixed(0) + "s"; // update time ahead of server date is signal of slow network
  else if (secs.toFixed(0) == 0) updated = "now";
  else if (day>7) updated = "inactive";
  else if (day>2) updated = day.toFixed(1)+" days";
  else if (hour>2) updated = hour.toFixed(0)+" hrs";
  else if (secs>180) updated = mins.toFixed(0)+" mins";

  secs = Math.abs(secs);
  var color = "rgb(255,0,0)";
  if (secs<25) color = "rgb(50,200,50)"
  else if (secs<60) color = "rgb(240,180,20)"; 
  else if (secs<(3600*2)) color = "rgb(255,125,20)"

  return "<span style='color:"+color+";'>"+updated+"</span>";
}

// Format value dynamically 
function list_format_value(value) {
  if (value == null) return 'NULL';
  value = parseFloat(value);
  if (value>=1000) value = parseFloat((value).toFixed(0));
  else if (value>=100) value = parseFloat((value).toFixed(1));
  else if (value>=10) value = parseFloat((value).toFixed(2));
  else if (value<=-1000) value = parseFloat((value).toFixed(0));
  else if (value<=-100) value = parseFloat((value).toFixed(1));
  else if (value<10) value = parseFloat((value).toFixed(2));
  return value;
}
