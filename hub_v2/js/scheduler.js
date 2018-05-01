var device = "";
var controls = {};
var previousPoint = false;
var available = [];
var unavailable = [];
var options = {};
var schedule = {};
var scheduler_html = $(".scheduler-template").html();
$(".scheduler-template").html("");

function draw_scheduler(devicein) 
{   
    device = devicein;
    $("#devicename").html(jsUcfirst(device));
    
    // 1. Load device template to get the control definition
    $.ajax({ url: emoncmspath+"device/template/get.json?device="+devices[device].type, dataType: 'json', async: true, success: function(template) { 
        controls = template.control;
        
        // 2. Fetch device settings stored in the demandshaper module
        $.ajax({ url: emoncmspath+"demandshaper/get?device="+device, dataType: 'json', async: true, success: function(result) {
            // Itterate through controls definition from template and copy over the settings that exist
            for (var property in controls) {
                if (result!=null && result.schedule!=null && result.schedule[property]!=undefined) {
                    controls[property].value = result.schedule[property];
                } else {
                    controls[property].value = controls[property].default;
                }
            }
            // Make schedule object global
            schedule = result.schedule;
            if (result==null || result.schedule==null) schedule = {};           
            
            $(".node-scheduler[node='"+device+"']").html(scheduler_html);
            $(".node-scheduler[node='"+device+"']").show();
            
            scheduler_update_ui();
            draw_schedule_output(schedule);
            
        }});
    }});
}

// -------------------------------------------------------------------------

$("#table").on("click",".scheduler-save",function(event) {
    
    // console.log("save");
    
    var tosave = {};
    for (var property in controls) {
        tosave[property] = controls[property].default;
    }
    
    for (var property in controls) {
        if (controls[property].type=="text") 
        tosave[property] = $("input[name='"+property+"']").val();
        if (controls[property].type=="checkbox") 
        tosave[property] = $(".scheduler-checkbox[name='"+property+"']").attr("state")*1;
        if (controls[property].type=="time")
        tosave[property] = (1*$("input[name='"+property+"-hour']").val()) + ($("input[name='"+property+"-minute']").val()/60);
        if (controls[property].type=="weekly-scheduler") {
            tosave[property] = [];
            for (var i=0; i<7; i++) {
                tosave[property][i] = $(".weekly-scheduler[name='"+property+"'][day="+i+"]").attr("val")*1;
                if (tosave[property][i]) tosave.runonce = false;
            }
            if (tosave.runonce) $(".scheduler-checkbox[name='runonce']").attr("state",1);
        }
    }
    
    scheduler_save(tosave,event);
});

$("#table").on("click",".scheduler-clear",function(event) {
    
    var tosave = {};
    for (var property in controls) {
        tosave[property] = controls[property].default;
    }
    
    scheduler_save(tosave,event);
    scheduler_update_ui();
});

$("#table").on("click",".schedule-output-heading",function(e) {
    
    var visible = $(".schedule-output-box").is(":visible");
    
    if (visible) {
        $(".schedule-output-box").hide(); 
    } else {
        $(".schedule-output-box").show(); 
        draw_schedule_output(schedule);
    }
    
    $(this).find(".triangle-dropdown").toggle();
    $(this).find(".triangle-pushup").toggle();
});

// -------------------------------------------------------------------------
function scheduler_update_ui() {
    for (var property in controls) {
        if (controls[property].type=="checkbox") {
            $(".scheduler-checkbox[name='"+property+"']").attr("state",controls[property].value);
        }
        
        if (controls[property].type=="time") {
            var time = controls[property].value;
            var hour = Math.floor(time);
            var mins = 60*(time-hour);
            if (hour<10) hour = "0"+hour;
            if (mins<10) mins = "0"+mins;
            $("input[name='"+property+"-hour']").val(hour);
            $("input[name='"+property+"-minute']").val(mins);
        }
        
        if (controls[property].type=="weekly-scheduler") {
            for (var i=0; i<7; i++) {
                $(".weekly-scheduler[name='"+property+"'][day="+i+"]").attr("val",controls[property].value[i]);
            }
        }
    }
    
    var runonce = true;
    for (var i=0; i<7; i++) {
        var dayval = $(".weekly-scheduler[name='repeat'][day="+i+"]").attr("val")*1;
        if (dayval) runonce = false;
    }
    if (runonce) {
        $(".scheduler-checkbox[name='runonce']").attr("state",1);
    } else {
        $(".scheduler-checkbox[name='runonce']").attr("state",0);
    } 
}


function scheduler_save(data,event) {    
    // ----------------------------------------------------------------------------------------------------
    // Scheduler
    // ----------------------------------------------------------------------------------------------------
    var event = typeof event != 'undefined' ? event : false;
    var schedule = data;
    schedule.device = device;
    schedule.basic = 0;
    //before ajax
    let notification = document.getElementById('scheduler-notification');   
    if (notification){
        notification.classList.remove('fadeOut');//allow notification to be shown again.
        notification.innerText = '';
    }
    //effect the clicked button
    let button = event ? event.target: false;
    if(button) button.classList.add('is-faded');

    $.ajax({ url: emoncmspath+"demandshaper/submit?schedule="+JSON.stringify(schedule),
        dataType: 'json',
        async: true,
        success: function(result) {
            schedule = result.schedule;
            if (result==null || result.schedule==null) schedule = {};
            draw_schedule_output(schedule);
            if (notification){//if dom element exists show notification
                if(result.schedule.end==0 && result.schedule.period==0){
                    message = t('Cleared');
                }else{
                    message = t('Saved');
                }
                notification.classList.remove('hide');//remove the default hide class
                notification.innerText = message;
                notification.classList.add('fadeOut','notification');//show notification and wait 3 seconds before fading out (using css class fadeOut
            }
        }
    })
    .always(function(){
      button.classList.remove('is-faded');//remove the faded effect from the clicked button once the ajax finishes
    });
}

function draw_schedule_output(schedule)
{
    var out = jsUcfirst(device)+" scheduled to run: ";
    
    if (schedule.periods.length) {
        var now = new Date();
        var now_hours = (now.getHours() + (now.getMinutes()/60));
        var period_start = (schedule.periods[0].start);
        
        var startsin = 0;
        if (now_hours>period_start) {
            startsin = (24 - now_hours) + period_start
        } else {
            startsin = period_start - now_hours
        }
        
        var hour = Math.floor(startsin);
        var mins = Math.round(60*(startsin-hour));
        var text = "Starts in "+mins+" mins";
        if (hour>0) text = "Starts in "+hour+" hrs "+mins+" mins";
        if (hour>=23 && mins>=30) text = "On";
        if (controls["active"].value==0) text = "Off"; 
        $(".startsin").html(text);
    } 
    
    
    var periods = [];
    for (var z in schedule.periods) {
        
        var start = 1*schedule.periods[z].start;
        if (start==0) start = "Midnight";
        else if (start==12) start = "Noon";
        else if (start>12) {
            start = (start - 12)+"pm";
        } else if (start<12) {
            start = start+"am";
        }
        
        var end = 1*schedule.periods[z].end;
        if (end==0) end = "Midnight";
        if (end==12) end = "Noon";
        else if (end>12) {
            end = (end - 12)+"pm";
        } else if (end<12) {
            end = end+"am";
        }
        periods.push(start+" to "+end+" ");
    }
    
    out += "<b>"+periods.join(", ")+"</b>";
    
    $("#schedule-output").html(out);
    
    if (schedule.probability!=undefined) {
        var probability = schedule.probability;
        
        var hh = 0;
        for (var z in probability) {
            if (1*probability[z][2]==schedule.end) hh = z;
        }
        
        var markings = [];
        // { color: "#000", lineWidth: 2, xaxis: { from: probability[hh][0], to: probability[hh][0] } },
        if (hh>0) markings.push({ color: "rgba(0,0,0,0.1)", xaxis: { from: probability[hh][0] } });
        
        
        options = {
            bars: { show: true, barWidth:1800*1000*0.75 },// align: 'center'
            xaxis: { mode: "time", timezone: "browser" },
            yaxis: { min: 0 },
            grid: {hoverable: true, clickable: true, markings: markings},
            selection: { mode: "x" },
            touch: { pan: "x", scale: "x" }
        }
        
        available = [];
        unavailable = [];
        for (var z in probability) {
            if (probability[z][4]) available.push([probability[z][0],probability[z][1]]);
            if (!probability[z][4]) unavailable.push([probability[z][0],probability[z][1]]);
        }
        
        var width = $("#placeholder_bound").width();
        if (width>0) {
            $("#placeholder").width(width);
            $.plot($('#placeholder'), [{data:available,color:"#ff0000"},{data:unavailable,color:"#888"}], options);
        }
    }
}

function resize() {
    var width = $("#placeholder_bound").width();
    $("#placeholder").width(width);
    $.plot($('#placeholder'), [{data:available,color:"#ff0000"},{data:unavailable,color:"#888"}], options);
}

$("#table").on("change",".timepicker-minute",function(){
    var val = $(this).val();
    val = Math.floor(val/30)*30;
    if (val<0) val = 0;
    if (val>59) val = 30;
    if (val<10) val = "0"+val;
    $(this).val(val);
});

$("#table").on("change",".timepicker-hour",function(){
    var val = $(this).val();
    val = Math.round(val);
    if (val<0) val = 0;
    if (val>23) val = 23;
    if (val<10) val = "0"+val;
    $(this).val(val);
});

$("#table").on("click",".weekly-scheduler-day",function(){
    var val = $(this).attr('val');
    if (val==0) {
        $(this).attr('val',1);
    } else {
        $(this).attr('val',0);
    }
    
    var runonce = true;
    for (var i=0; i<7; i++) {
        var dayval = $(".weekly-scheduler[name='repeat'][day="+i+"]").attr("val")*1;
        if (dayval) runonce = false;
    }
    if (runonce) {
        $(".scheduler-checkbox[name='runonce']").attr("state",1);
    } else {
        $(".scheduler-checkbox[name='runonce']").attr("state",0);
    }
});

$("#table").on("click",".scheduler-checkbox[name='runonce']",function(){
    var state = $(this).attr('state')*1;
    if (state) {
        $(".weekly-scheduler[name='repeat']").attr("val",1);
    } else {
        $(".weekly-scheduler[name='repeat']").attr("val",0);
    }
});

$("#table").on("click",".scheduler-checkbox",function(){
    var name = $(this).attr('name');
    var val = $(this).attr('state');
    if (val==0) {
        $(this).attr('state',1);
        if (name=="active") $(".scheduler-inner").css("color","#ea510e");
    } else {
        $(this).attr('state',0);
        if (name=="active") $(".scheduler-inner").css("color","#aaa");
    }
});

$("#table").on("click",".weekly-scheduler-repeat",function(){
    if ($(this)[0].checked) {
        
    } else {
        
    }
});

$('#placeholder').bind("plothover", function (event, pos, item)
{
    if (item) {
        if (previousPoint != item.datapoint) {
            previousPoint = item.datapoint;
            
            $("#tooltip").remove();
            var itemTime = item.datapoint[0];
            var itemVal = item.datapoint[1];
            var datestr = (new Date(itemTime)).format("HH:MM ddd");//, mmm dS");
            tooltip(item.pageX, item.pageY, datestr+"<br>val:"+itemVal.toFixed(1), "#DDDDDD");
        }
    } else {
        $("#tooltip").remove();
        previousPoint = null;
    }
});

$(window).resize(function(){
    resize();
});

function jsUcfirst(string) {return string.charAt(0).toUpperCase() + string.slice(1);}
