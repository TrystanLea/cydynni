            
            <div id="login-block" class="block">
                <div class="block-title bg-household"><div class="triangle-dropdown hide"></div><div class="triangle-pushup show"></div></div>
                <div class="block-content">
                    
                    <div class="bg-household" style="padding:20px">
                    
                        <div style="font-weight:bold; font-size:32px"><?php echo t("Log in"); ?></div>
                        <?php echo t("Please login to view account"); ?><br><br>
                    
                        <input id="email" type="text" placeholder="Username or email..."><br><br>
                        <input id="password" type="password" placeholder="Password..."><br>
                        
                        <br>
                        <button id="login" class="btn"><?php echo t("Login");?></button><br><br>
                        <div id="passwordreset-start" style="display:inline-block; cursor:pointer;"><?php echo t("Forgotten your password?");?></div>
                        <br><br>
                        <div id="alert"></div>
                    </div>
                </div>
            </div>

            <div id="passwordreset-block" class="block" style="display:none">
                <div class="block-title bg-household"><div class="triangle-dropdown hide"></div><div class="triangle-pushup show"></div></div>
                <div class="block-content">                    
                    <div class="bg-household" style="padding:20px">
                        <p id="passwordreset-title"></p>
                        <p>
                          <input id="passwordreset-email" type="text" placeholder="Email..." style="border: 1px solid rgb(41,171,226)"><br><br>
                          <button id="passwordreset" class="btn"><?php echo t("Reset password");?></button> <button id="passwordreset-cancel" class="btn"><?php echo t("Cancel");?></button><br>
                        </p>
                        <div id="passwordreset-alert"></div>
                    </div>
                </div>
            </div>

            <div class="block household-block">
              <div class="block-title bg-household"><?php echo t("Your Score and Savings"); ?><div class="triangle-dropdown hide" style="margin-left:10px"></div><div class="triangle-pushup show" style="margin-left:10px"></div></div>
              
              <div class="block-content" style="color:#c20000">
              
                <div class="bg-household">
                  <b><?php echo t("On the"); ?> <span class="household_date"></span> <?php echo t("you scored"); ?>:</b>
                  <div style="font-size:22px; font-weight:bold; padding-top:5px"><span class="household_score"></span>/100</div>
                </div>
                
                <div class="no-padding">
                  <div class="triangle-wrapper">
                    <div class="triangle-down">
                      <div class="triangle-down-content triangle-household-bg"></div>
                    </div>
                  </div>
                </div>
                <br>
                <img id="household_star1" src="<?php echo $path; ?>images/starred.png" style="width:45px">
                <img id="household_star2" src="<?php echo $path; ?>images/starred.png" style="width:45px">
                <img id="household_star3" src="<?php echo $path; ?>images/star20red.png" style="width:45px">
                <img id="household_star4" src="<?php echo $path; ?>images/star20red.png" style="width:45px">
                <img id="household_star5" src="<?php echo $path; ?>images/star20red.png" style="width:45px">
              
                <p class="household_status"></p>
                
                <div class="bg-household" style="height:100px">
                  <div style="padding:5px">
                    <p><?php echo t("You used"); ?> <span class="household_totalkwh"></span> kWh. <?php echo t("It cost"); ?> £<span class="household_totalcost"></span></p>
                    <p><?php echo t("Compared with 12p/kWh reference price, you saved"); ?>:</p>
                  </div>
                </div>
                
                <div class="no-padding">
                  <div class="triangle-wrapper">
                    <div class="triangle-down">
                      <div class="triangle-down-content triangle-household-bg"></div>
                    </div>
                  </div>
                </div>
                
                <br>
                <div class="circle bg-household">
                    <div class="circle-inner" style="padding-top:52px">
                        <div style="font-size:36px" class="household_costsaving">£0.00</div>
                    </div>
                </div>
                <br>
                
              </div>
            </div>
            
            <div class="block household-block">
                <div class="block-title bg-household2"><?php echo t("Your usage over time"); ?><div class="triangle-dropdown hide"></div><div class="triangle-pushup show"></div></div>
                <div class="block-content">
                
                    <div class="bg-household2">
                      <div class="bound"><?php echo t("Here's what your electricity use looked like on"); ?><br><b><span class="household_date"></span> 2017</b></div>
                    </div>
                    
                    <div class="no-padding">
                      <div class="triangle-wrapper">
                        <div class="triangle-down">
                          <div class="triangle-down-content triangle-household2-bg"></div>
                        </div>
                      </div>
                    </div>
                
                    <div style="padding:10px">
                        <div id="household_bargraph_bound" style="width:100%; height:405px;">
                            <div id="household_bargraph_placeholder" style="height:405px"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="block household-block">
                <div class="block-title bg-household3"><?php echo t("Your usage by price"); ?><div class="triangle-dropdown hide"></div><div class="triangle-pushup show"></div></div>
                <div class="block-content">
                
                    <div class="bg-household3">
                      <div class="bound" style="padding-bottom:20px"><?php echo t("Your electricity is provided on five different price bands. Here's how much of each you used on"); ?> <span class="household_date"></span> 2017</div>
                    </div>
                    
                    <br>
                    
                    <div class="box3">
                      <div style="font-size:26px; font-weight:bold; color:#f47677"><?php echo t("ELECTRICITY"); ?></div>
                      <div id="household_piegraph1_bound" style="width:100%; height:300px; margin: 0 auto">
                          <canvas id="household_piegraph1_placeholder"></canvas>
                      </div>
                      <div id="household_hrbar1_bound" style="width:100%; height:50px; margin: 0 auto">
                          <canvas id="household_hrbar1_placeholder"></canvas>
                      </div>
                      <br>
                    </div>
                
                    <div class="box3">
                      <div style="font-size:26px; font-weight:bold; color:#f47677"><?php echo t("COST"); ?></div>
                      <div id="household_piegraph2_bound" style="width:100%; height:300px; margin: 0 auto">
                          <canvas id="household_piegraph2_placeholder"></canvas>
                      </div>
                      <div id="household_hrbar2_bound" style="width:100%; height:50px; margin: 0 auto">
                          <canvas id="household_hrbar2_placeholder"></canvas>
                      </div>
                      <br>
                    </div>
                    
                    <div class="box3">
                      <div style="padding:15px; text-align:left; margin: 0 auto; max-width:270px">
                        <table class="keytable">
                          <?php foreach ($tariffs[$club] as $key=>$tariff) { ?>
                          <tr>
                            <td><div class="key" style="background-color:<?php echo $tariff['color']; ?>"></div></td>
                            <td><b><?php echo t($tariff['name']." Price");?> </b><br><span id="household_<?php echo $key; ?>_kwh"></span> kWh @ <?php echo $tariff['cost']*100; ?> p/kWh<br><?php echo t("Costing");?> £<span id="household_<?php echo $key; ?>_cost"></span></td>
                          </tr>
                          <?php } ?>
                        </table>
                      </div>
                    </div>
                    
                    <div style="clear:both"></div>

                    <div class="bg-household3" style="padding:20px">
                      <div class="bound"><?php echo t("Head to the tips section or get in touch with your Energy Local club to see how you can shift more of your use to cheaper times."); ?></div>
                    </div>
                    
                </div>
            </div>