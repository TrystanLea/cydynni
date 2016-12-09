<?php

class User
{
    private $mysqli;
    
    public function __construct($mysqli)
    {
        $this->mysqli = $mysqli;
    }
    
    //---------------------------------------------------------------------------------------
    // Status
    //---------------------------------------------------------------------------------------
    public function status()
    {
        if (!isset($_SESSION['userid'])) return false;
        if ($_SESSION['userid']<1) return false;
        
        $session = $_SESSION;
        if (!isset($session['admin'])) $session['admin'] = 0;
        return $session;
    }
    
    //---------------------------------------------------------------------------------------
    // Status
    //---------------------------------------------------------------------------------------
    public function userlist()
    {
        $result = $this->mysqli->query("SELECT id,email,apikey,feedid,admin,welcomedate,hits,MPAN FROM users");
        $users = array();
        while($row = $result->fetch_object()) $users[] = $row;
        return $users;
    }
    
    private function getbyemail($email) {
        $stmt = $this->mysqli->prepare("SELECT id,email,dbhash,salt,admin,apikey FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows!=1) return false;
        
        $stmt->bind_result($id,$email,$dbhash,$salt,$admin,$apikey);
        $u = $stmt->fetch();
        return array(
            "id"=>$id,
            "email"=>$email,
            "dbhash"=>$dbhash,
            "salt"=>$salt,
            "admin"=>$admin,
            "apikey"=>$apikey
        );
    }
    
    public function getbyid($id) {
        $id = (int) $id;
        $result = $this->mysqli->query("SELECT email,apikey FROM users WHERE id='$id'");
        $row = $result->fetch_array();
        
        return array(
            "email"=>$row["email"],
            "apikey"=>$row["apikey"]
        );
    }
    
    //---------------------------------------------------------------------------------------
    // User login
    //---------------------------------------------------------------------------------------
    public function register($email,$password,$apikey,$feedid)
    {
        if ($email==null) return "Email address missing";
        if ($password==null) return "Password missing";
        if (!ctype_alnum($apikey)) return "Apikey must be alpha-numeric";
        if (!is_numeric($feedid)) return "Feed id must be numeric";
        
        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return "Invalid email";
        if (strlen($password) < 4 || strlen($password) > 250) return "Password length error";
        $feedid = (int) $feedid;

        $stmt = $this->mysqli->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows>0) return "User already exists";

        $hash = hash('sha256', $password);
        $salt = md5(uniqid(mt_rand(), true));
        $dbhash = hash('sha256', $salt . $hash);

        $stmt = $this->mysqli->prepare("INSERT INTO users (email, dbhash, salt, admin,apikey,feedid) VALUES (?,?,?,0,?,?)");
        $stmt->bind_param("sssss", $email, $dbhash, $salt,$apikey,$feedid);
        if (!$stmt->execute()) {
            return "Error creating user";
        }

        // Make the first user an admin
        $userid = $this->mysqli->insert_id;
        if ($userid == 1) $this->mysqli->query("UPDATE users SET admin = 1 WHERE id = '1'");
        return $userid;
    }
    
    //---------------------------------------------------------------------------------------
    // User login
    //---------------------------------------------------------------------------------------    
    public function login($email,$password)
    {        
        if ($email==null) return "Email address missing";
        if ($password==null) return "Password missing";
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return "Invalid email";
        
        if (!$u = $this->getbyemail($email)) return "User not found";
        
        $hash = hash('sha256', $u['salt'] . hash('sha256', $password));
        if ($hash!=$u['dbhash']) return "Invalid password";
        
        session_regenerate_id();
        $_SESSION['userid'] = $u['id'];
        $_SESSION['email'] = $u['email'];
        $_SESSION['admin'] = $u['admin'];
        $_SESSION['apikey'] = $u['apikey'];
        return $_SESSION;
    }

    //---------------------------------------------------------------------------------------
    // Change password
    //--------------------------------------------------------------------------------------- 
    public function change_password_nocheck($userid, $new)
    {
        $userid = intval($userid);

        if (strlen($new) < 4 || strlen($new) > 250) return "New password length error";

        // 2) Save new password
        $hash = hash('sha256', $new);
        $salt = md5(uniqid(rand(), true));
        $newdbhash = hash('sha256', $salt . $hash);
        $this->mysqli->query("UPDATE users SET dbhash = '$newdbhash', salt = '$salt' WHERE id = '$userid'");
        return "Password changed";
    }
    
    public function change_email($userid, $email) 
    {
        $userid = (int) $userid;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return "Invalid email";
        $this->mysqli->query("UPDATE users SET email = '$email' WHERE id = '$userid'");
        return "Email updated";
    }

    //---------------------------------------------------------------------------------------
    // Change password
    //--------------------------------------------------------------------------------------- 
    public function change_password($userid, $old, $new)
    {
        $userid = intval($userid);

        if (strlen($old) < 4 || strlen($old) > 250) return "Old password length error";
        if (strlen($new) < 4 || strlen($new) > 250) return "New password length error";

        // 1) check that old password is correct
        $result = $this->mysqli->query("SELECT dbhash, salt FROM users WHERE id = '$userid'");
        $row = $result->fetch_object();
        $hash = hash('sha256', $row->salt . hash('sha256', $old));

        if ($hash == $row->dbhash)
        {
            // 2) Save new password
            $hash = hash('sha256', $new);
            $salt = md5(uniqid(rand(), true));
            $newdbhash = hash('sha256', $salt . $hash);
            $this->mysqli->query("UPDATE users SET dbhash = '$newdbhash', salt = '$salt' WHERE id = '$userid'");
            return "Password changed";
        }
        else
        {
            return "Old password incorect";
        }
    }

    //---------------------------------------------------------------------------------------
    // Forgotten password
    //--------------------------------------------------------------------------------------- 
    public function registeremail($userid)
    {
        $userid = (int) $userid;
        $result = $this->mysqli->query("SELECT * FROM users WHERE id = '$userid'");
        if (!$row = $result->fetch_array()) return "user not found";
        
        $email = $row['email'];
        
        // Generate new random password
        $newpass = hash('sha256',md5(uniqid(rand(), true)));
        $newpass = substr($newpass, 0, 10);

        // Hash and salt
        $hash = hash('sha256', $newpass);
        $salt = md5(uniqid(rand(), true));
        $dbhash = hash('sha256', $salt . $hash);

        // Save password and salt
        $this->mysqli->query("UPDATE users SET dbhash = '$dbhash', salt = '$salt' WHERE id = '$userid'");

        $subject = "Welcome to CydYnni, account details";   
                         
        $message = view("emailbound.php",array(
            "title"=>"Croeso i CydYnni, Welcome to CydYnni",
            "message"=>"Gallwch fewngofnodi nawr ar <a href='http://cydynni.org.uk'>cydynni.org.uk</a> gyda chyfeiriad e-bost: $email a chyfrinair: $newpass.<br><i>Rydym yn argymell eich bod yn newid y cyfrinair a roddir uchod i gadw eich cyfrif yn ddiogel. I newid y cyfrinair: Mewngofnodwch ar cydynni.org.uk yna cliciwch ar icon Fy Nghyfrif</i><br><br>You can now login at <a href='http://cydynni.org.uk'>cydynni.org.uk</a> with email address: $email and password: $newpass.<br><i>It is recommended to change the password given above to keep your account secure. To change the password: Login at cydynni.org.uk then click on the My Account icon."
        ));

        // ------------------------------------------------------------------
        // Email with swift
        // ------------------------------------------------------------------
        $have_swift = @include_once ("lib/swift/swift_required.php"); 

        if (!$have_swift){
            print "Could not find SwiftMailer - cannot proceed";
            exit;
        };

        global $smtp_email_settings;
        
        // ---------------------------------------------------------
        // Removed sequre connect $smtp_email_settings['port'],'ssl'
        // Not supported by 123reg
        // ---------------------------------------------------------
        $transport = Swift_SmtpTransport::newInstance($smtp_email_settings['host'],25)
          ->setUsername($smtp_email_settings['username'])
          ->setPassword($smtp_email_settings['password']);

        $mailer = Swift_Mailer::newInstance($transport);
        $message = Swift_Message::newInstance()
          ->setSubject($subject)
          ->setFrom($smtp_email_settings['from'])
          ->setTo(array($email))
          ->setBody($message, 'text/html');
        $result = $mailer->send($message);
        // ------------------------------------------------------------------
        return "Email sent";
    }
    
    //---------------------------------------------------------------------------------------
    // Forgotten password
    //--------------------------------------------------------------------------------------- 
    public function passwordreset($email)
    {
        // return false;
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return "Email address format error";

        if (!$u = $this->getbyemail($email)) return "User not found";
        $userid = $u['id'];

        // Generate new random password
        $newpass = hash('sha256',md5(uniqid(rand(), true)));
        $newpass = substr($newpass, 0, 10);

        // Hash and salt
        $hash = hash('sha256', $newpass);
        $salt = md5(uniqid(rand(), true));
        $dbhash = hash('sha256', $salt . $hash);

        // Save password and salt
        $this->mysqli->query("UPDATE users SET dbhash = '$dbhash', salt = '$salt' WHERE id = '$userid'");

        $subject = "CydYnni password reset";                    
        $message = "<p>A password reset was requested for your CydYnni account.</p><p>Your can now login with password: $newpass </p>";

        // ------------------------------------------------------------------
        // Email with swift
        // ------------------------------------------------------------------
        $have_swift = @include_once ("lib/swift/swift_required.php"); 

        if (!$have_swift){
            print "Could not find SwiftMailer - cannot proceed";
            exit;
        };

        global $smtp_email_settings;
        
        // ---------------------------------------------------------
        // Removed sequre connect $smtp_email_settings['port'],'ssl'
        // Not supported by 123reg
        // ---------------------------------------------------------
        $transport = Swift_SmtpTransport::newInstance($smtp_email_settings['host'],25)
          ->setUsername($smtp_email_settings['username'])
          ->setPassword($smtp_email_settings['password']);

        $mailer = Swift_Mailer::newInstance($transport);
        $message = Swift_Message::newInstance()
          ->setSubject($subject)
          ->setFrom($smtp_email_settings['from'])
          ->setTo(array($email))
          ->setBody($message, 'text/html');
        $result = $mailer->send($message);
        // ------------------------------------------------------------------
        return "Email sent";
    }


    //---------------------------------------------------------------------------------------
    // Logout
    //---------------------------------------------------------------------------------------
    public function logout() 
    {
        session_unset();
        session_destroy();
    }
}
