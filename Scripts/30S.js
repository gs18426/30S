document.addEventListener('DOMContentLoaded', function() {
    const cookies = {
        set: function(name, value, days) {
            try {
                const expires = new Date();
                expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
            } catch (e) {
                console.error('Error setting cookie:', e);
            }
        },
        get: function(name) {
            try {
                const nameEQ = name + "=";
                const ca = document.cookie.split(';');
                for(let i = 0; i < ca.length; i++) {
                    let c = ca[i].trim();
                    if (c.indexOf(nameEQ) === 0) {
                        return decodeURIComponent(c.substring(nameEQ.length));
                    }
                }
            } catch (e) {
                console.error('Error getting cookie:', e);
            }
            return null;
        }
    };

    // Debug logging
    console.log('Current cookies:', document.cookie);
    console.log('Setup complete status:', cookies.get('setupComplete'));
    console.log('Stored username:', cookies.get('username'));

    const setupScreen = document.getElementById('setup-screen');
    const bootScreen = document.getElementById('boot-screen');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const setupButton = document.getElementById('setup-complete');

    // Verify elements exist
    if (!setupScreen || !bootScreen || !username || !password || !setupButton) {
        console.error('Required elements not found!');
        return;
    }

    // Hide boot screen initially
    bootScreen.style.display = 'none';

    // Check if setup was already completed
    if (cookies.get('setupComplete') === 'true' && cookies.get('username')) {
        console.log('Setup already completed, skipping setup screen');
        setupScreen.style.opacity = '0';
        setupScreen.style.display = 'none';
        bootScreen.style.display = 'flex';
        startBootSequence();
    } else {
        console.log('Setup not completed, showing setup screen');
        setupScreen.style.opacity = '1';
        setupScreen.style.display = 'flex';
        bootScreen.style.display = 'none';

        // Setup navigation
        const setupSteps = document.querySelectorAll('.setup-step');
        let currentStep = 0;

        document.querySelectorAll('.setup-next').forEach(button => {
            button.addEventListener('click', () => {
                setupSteps[currentStep].style.display = 'none';
                currentStep++;
                setupSteps[currentStep].style.display = 'block';
            });
        });

        document.querySelectorAll('.setup-back').forEach(button => {
            button.addEventListener('click', () => {
                setupSteps[currentStep].style.display = 'none';
                currentStep--;
                setupSteps[currentStep].style.display = 'block';
            });
        });

        // Setup button click handler
        setupButton.onclick = function() {
            console.log('Setup button clicked');
            const usernameValue = username.value.trim();
            const passwordValue = password.value.trim();

            if (!usernameValue || !passwordValue) {
                alert('Please enter both username and password');
                return;
            }

            try {
                // Save all settings
                cookies.set('setupComplete', 'true', 365);
                cookies.set('username', usernameValue, 365);
                cookies.set('systemPrefs', JSON.stringify({
                    theme: 'default',
                    fontSize: '14px',
                    lastLogin: new Date().toISOString(),
                    installPath: 'C:\\Program Files\\30S',
                    installDate: new Date().toISOString()
                }), 365);

                localStorage.setItem('username', usernameValue);
                localStorage.setItem('password', passwordValue);
                localStorage.setItem('commandHistory', '[]');
                
                console.log('Setup data saved successfully');
                
                // Show installing progress in current step
                setupSteps[currentStep].innerHTML = `
                    <h2>Installing 30S...</h2>
                    <p>Copying files...</p>
                    <div class="boot-progress">
                        <div class="boot-bar"></div>
                    </div>
                `;

                const progressBar = setupSteps[currentStep].querySelector('.boot-bar');
                progressBar.style.width = '0%';
                
                // Simulate installation progress
                let progress = 0;
                const installInterval = setInterval(() => {
                    progress += 2;
                    progressBar.style.width = `${progress}%`;
                    if (progress >= 100) {
                        clearInterval(installInterval);
                        setTimeout(() => {
                            setupScreen.style.opacity = '0';
                            bootScreen.style.opacity = '0';
                            bootScreen.style.display = 'flex';
                            setTimeout(() => {
                                setupScreen.style.display = 'none';
                                bootScreen.style.opacity = '1';
                                startBootSequence();
                            }, 1000);
                        }, 500);
                    }
                }, 50);
                
            } catch (e) {
                console.error('Error during setup:', e);
                alert('Error saving setup data. Please try again.');
            }
        };
    }

    function startBootSequence() {
        const bootBar = document.querySelector('.boot-bar');
        const bootText = document.querySelector('.boot-text');
        
        const systemChecks = [
            { task: 'Initializing kernel...', duration: 1000 },
            { task: 'Loading user data...', duration: 800, action: () => {
                return `User ${localStorage.getItem('username')} found`;
            }},
            { task: 'Loading command history...', duration: 600, action: () => {
                const history = JSON.parse(localStorage.getItem('commandHistory') || '[]');
                return `${history.length} commands loaded`;
            }},
            { task: 'Loading preferences...', duration: 700, action: () => {
                const prefs = JSON.parse(cookies.get('systemPrefs') || '{}');
                return `${Object.keys(prefs).length} preferences loaded`;
            }},
            { task: 'Checking system status...', duration: 900, action: () => {
                return `RAM: ${(performance.memory?.usedJSHeapSize / 1048576 || 0).toFixed(2)}MB / ${(performance.memory?.jsHeapSizeLimit / 1048576 || 0).toFixed(2)}MB`;
            }},
        ];

        let currentCheck = 0;
        let totalChecks = systemChecks.length;
        bootBar.style.width = '0%';

        function runNextCheck() {
            if (currentCheck < totalChecks) {
                const check = systemChecks[currentCheck];
                bootText.textContent = check.task;
                
                setTimeout(() => {
                    if (check.action) {
                        bootText.textContent = check.action();
                    }
                    bootBar.style.width = `${((currentCheck + 1) / totalChecks) * 100}%`;
                    currentCheck++;
                    runNextCheck();
                }, check.duration);
            } else {
                setTimeout(() => {
                    bootScreen.style.opacity = '0';
                    setTimeout(() => {
                        bootScreen.style.display = 'none';
                    }, 500);
                }, 500);
            }
        }

        runNextCheck();
    }

    const consoleDiv = document.getElementById('os-console');
    const os = {
        commandHistory: JSON.parse(localStorage.getItem('commandHistory') || '[]'),
        historyIndex: -1,
        
        commands: {
            help: () => 'Available commands: Type "list" to see all 100 commands',
            list: () => Object.keys(os.commands).join(', '),
            clear: () => { consoleDiv.innerHTML = ''; return ''; },
            echo: (args) => args || '',
            time: () => new Date().toLocaleTimeString(),
            date: () => new Date().toLocaleDateString(),
            about: () => '30S v1.0 - A modern terminal experience',
            whoami: () => `${localStorage.getItem('username')}@30S`,
            ls: () => 'Documents/ Downloads/ Pictures/ Music/',
            version: () => '30S Version 1.1.1',
            credits: () => 'Created by the 20Cat Team',
            color: () => {
                const colors = ['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#00ffff'];
                consoleDiv.style.color = colors[Math.floor(Math.random() * colors.length)];
                return 'Color changed!';
            },
            weather: () => 'Current weather: 22°C, Partly Cloudy',
            calc: (args) => {
                try { 
                    const result = Function('"use strict";return (' + args + ')')();
                    return result || 'Usage: calc 1 + 1'; 
                } catch { 
                    return 'Invalid calculation'; 
                }
            },
            joke: () => {
                const jokes = ["Why do programmers prefer dark mode? Because light attracts bugs!",
                    "How many programmers does it take to change a light bulb? None, that's a hardware problem!"];
                return jokes[Math.floor(Math.random() * jokes.length)];
            },
            // System commands
            reboot: () => 'System is rebooting...',
            shutdown: () => {
                const shutdownScreen = document.getElementById('shutdown-screen');
                shutdownScreen.style.display = 'flex';
                setTimeout(() => {
                    shutdownScreen.style.opacity = '1';
                    setTimeout(() => {
                        // Fade out all elements
                        document.body.style.transition = 'opacity 2s';
                        document.body.style.opacity = '0';
                        // Redirect to blank page after shutdown animation
                        setTimeout(() => {
                            window.location.href = 'about:blank';
                        }, 2000);
                    }, 2000);
                }, 100);
                return 'Shutting down system...';
            },
            hibernate: () => 'System entering hibernate mode...',
            sleep: () => 'System entering sleep mode...',
            update: () => 'Checking for system updates...',
            stats: () => 'CPU: 2.4GHz | RAM: 8GB | Disk: 256GB',
            top: () => 'Running processes: Terminal, System, Background services',
            kill: (args) => `Process ${args} terminated`,
            ping: () => 'Pong! Latency: 23ms',
            ipconfig: () => 'IP: 192.168.1.1 | Subnet: 255.255.255.0',
            // File operations
            mkdir: (args) => `Directory ${args} created`,
            rmdir: (args) => `Directory ${args} removed`,
            touch: (args) => `File ${args} created`,
            rm: (args) => `File ${args} removed`,
            cp: (args) => `File copied successfully`,
            mv: (args) => `File moved successfully`,
            cat: (args) => `Reading file ${args}...`,
            tail: (args) => `Showing last 10 lines of ${args}`,
            head: (args) => `Showing first 10 lines of ${args}`,
            find: (args) => `Searching for ${args}...`,
            // Network commands
            ssh: (args) => `Connecting to ${args}...`,
            ftp: (args) => `FTP connection established to ${args}`,
            wget: (args) => `Downloading ${args}...`,
            curl: (args) => `Fetching data from ${args}...`,
            netstat: () => 'Active network connections...',
            // User management
            passwd: () => 'Changing password...',
            adduser: (args) => `Adding user ${args}...`,
            deluser: (args) => `Removing user ${args}...`,
            chmod: (args) => `Changing permissions for ${args}...`,
            chown: (args) => `Changing ownership of ${args}...`,
            // Utilities
            sort: (args) => `Sorting ${args}...`,
            grep: (args) => `Searching pattern in ${args}...`,
            diff: (args) => `Comparing files...`,
            tar: (args) => `Archiving ${args}...`,
            zip: (args) => `Compressing ${args}...`,
            unzip: (args) => `Extracting ${args}...`,
            // Development tools
            git: (args) => `Git: ${args}`,
            make: (args) => `Building ${args}...`,
            gcc: (args) => `Compiling ${args}...`,
            npm: (args) => `NPM: ${args}`,
            docker: (args) => `Docker: ${args}`,
            // Database
            mysql: () => 'MySQL client version 8.0.0',
            mongo: () => 'MongoDB shell version 5.0.0',
            redis: () => 'Redis client connected',
            postgres: () => 'PostgreSQL 13.0',
            // Entertainment
            play: (args) => `Playing ${args}...`,
            pause: () => 'Playback paused',
            stop: () => 'Playback stopped',
            next: () => 'Playing next track',
            prev: () => 'Playing previous track',
            // System info
            cpu: () => 'CPU usage: 23%',
            ram: () => 'Memory usage: 4.2GB/8GB',
            disk: () => 'Disk usage: 120GB/256GB',
            temp: () => 'CPU temperature: 45°C',
            uptime: () => 'System uptime: 3 days, 2 hours',
            // Security
            scan: () => 'Scanning system for vulnerabilities...',
            encrypt: (args) => `Encrypting ${args}...`,
            decrypt: (args) => `Decrypting ${args}...`,
            firewall: () => 'Firewall status: Active',
            antivirus: () => 'Antivirus: Running',
            // Misc
            coffee: () => 'Coffee brewing...',
            todo: () => 'Todo list: 1. Code more 2. Debug less',
            random: () => Math.floor(Math.random() * 100),
            quote: () => 'Keep coding and carry on!',
            matrix: () => 'Wake up, Neo...',
            // Add system preferences commands
            prefs: () => {
                const prefs = JSON.parse(cookies.get('systemPrefs') || '{}');
                return `System Preferences:\n${Object.entries(prefs).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
            },
            setpref: (args) => {
                const [key, ...value] = args.split(' ');
                const prefs = JSON.parse(cookies.get('systemPrefs') || '{}');
                prefs[key] = value.join(' ');
                cookies.set('systemPrefs', JSON.stringify(prefs), 365);
                return `Preference ${key} updated`;
            },
            // Advanced System Commands
            sysinfo: () => `OS: 30S v1.0\nArchitecture: x64\nKernel: 4.19.0\nUptime: ${Math.floor(performance.now() / 1000)}s`,
            benchmark: () => 'Running system benchmark...',
            drivers: () => 'Listing system drivers...',
            services: () => 'Active services: 34 running, 6 stopped',
            modules: () => 'Loaded kernel modules: 45',
            power: () => 'Power status: AC connected, Battery 85%',
            
            // Process Management
            ps: () => 'Process list:\n1. init\n2. system\n3. user_session',
            nice: (args) => `Setting priority for process ${args}...`,
            bg: (args) => `Moving process ${args} to background`,
            fg: (args) => `Moving process ${args} to foreground`,
            nohup: (args) => `Running ${args} with hangup immunity`,
            
            // Network Tools
            route: () => 'Routing table entries...',
            traceroute: (args) => `Tracing route to ${args}...`,
            nslookup: (args) => `Looking up DNS for ${args}...`,
            whois: (args) => `WHOIS lookup for ${args}...`,
            
            // File System Operations
            chmod: (args) => `Changing permissions: ${args}`,
            chown: (args) => `Changing ownership: ${args}`,
            ln: (args) => `Creating symbolic link: ${args}`,
            df: () => 'Disk usage: 45% used',
            du: (args) => `Directory size: ${args}`,
            
            // Text Processing
            sed: (args) => `Stream editing: ${args}`,
            awk: (args) => `Pattern scanning: ${args}`,
            grep: (args) => `Pattern matching: ${args}`,
            wc: (args) => `Word count: ${args}`,
            sort: (args) => `Sorting: ${args}`,
            
            // Package Management
            apt: (args) => `Package management: ${args}`,
            yum: (args) => `YUM package manager: ${args}`,
            pacman: (args) => `Pacman package manager: ${args}`,
            brew: (args) => `Homebrew: ${args}`,
            snap: (args) => `Snap packages: ${args}`,

            // Development Tools
            make: (args) => `Building project: ${args}`,
            gcc: (args) => `Compiling: ${args}`,
            gdb: (args) => `Debugging: ${args}`,
            valgrind: (args) => `Memory analysis: ${args}`,
            strace: (args) => `Trace system calls: ${args}`,
            
            // Version Control
            git: (args) => `Git operation: ${args}`,
            svn: (args) => `SVN operation: ${args}`,
            hg: (args) => `Mercurial operation: ${args}`,
            
            // Container Management
            docker: (args) => `Docker: ${args}`,
            kubectl: (args) => `Kubernetes: ${args}`,
            helm: (args) => `Helm charts: ${args}`,
            
            // Database Operations
            mysql: (args) => `MySQL: ${args}`,
            psql: (args) => `PostgreSQL: ${args}`,
            mongo: (args) => `MongoDB: ${args}`,
            redis: (args) => `Redis: ${args}`,
            
            // Security Tools
            nmap: (args) => `Network scanning: ${args}`,
            openssl: (args) => `OpenSSL: ${args}`,
            ssh_keygen: () => 'Generating SSH key pair...',
            gpg: (args) => `GPG encryption: ${args}`,
            
            // System Maintenance
            backup: () => 'Creating system backup...',
            restore: () => 'Restoring from backup...',
            clean: () => 'Cleaning system cache...',
            repair: () => 'Repairing file system...',
            
            // Monitoring Tools
            htop: () => 'Interactive process viewer',
            iotop: () => 'IO usage monitor',
            nethogs: () => 'Network usage monitor',
            iftop: () => 'Network bandwidth monitor',
            
            // File Compression
            gzip: (args) => `Compressing with gzip: ${args}`,
            bzip2: (args) => `Compressing with bzip2: ${args}`,
            xz: (args) => `Compressing with xz: ${args}`,
            
            // Media Tools
            ffmpeg: (args) => `FFmpeg: ${args}`,
            imagemagick: (args) => `ImageMagick: ${args}`,
            vlc: (args) => `VLC: ${args}`,
            
            // Programming Languages
            python: (args) => `Python: ${args}`,
            node: (args) => `Node.js: ${args}`,
            ruby: (args) => `Ruby: ${args}`,
            perl: (args) => `Perl: ${args}`,
            java: (args) => `Java: ${args}`,
            
            // Web Tools
            curl: (args) => `cURL request: ${args}`,
            wget: (args) => `Downloading: ${args}`,
            httpie: (args) => `HTTP client: ${args}`,
            
            // Text Editors
            vim: (args) => `Opening vim: ${args}`,
            nano: (args) => `Opening nano: ${args}`,
            emacs: (args) => `Opening emacs: ${args}`,
            
            // System Information
            uname: () => '30S_OS x86_64',
            hostnamectl: () => 'System hostname information',
            lscpu: () => 'CPU architecture information',
            lsmem: () => 'Memory information',
            
            // User Management
            useradd: (args) => `Adding user: ${args}`,
            userdel: (args) => `Deleting user: ${args}`,
            groupadd: (args) => `Adding group: ${args}`,
            passwd: (args) => `Changing password for: ${args}`,
            
            // Networking Tools
            netstat: () => 'Network statistics',
            ss: () => 'Socket statistics',
            arp: () => 'Address resolution protocol',
            tcpdump: () => 'Network packet analyzer',
        },

        runCommand: function(input) {
            input = input.trim();
            if (input === '') return;
            
            this.commandHistory.push(input);
            this.historyIndex = this.commandHistory.length;
            
            const [cmd, ...args] = input.toLowerCase().split(' ');
            
            try {
                if (this.commands[cmd]) {
                    const output = this.commands[cmd](args.join(' '));
                    if (output !== '') {
                        consoleDiv.innerHTML += `<div style="color: #00ffff">> ${input}</div>`;
                        consoleDiv.innerHTML += `<div>${output}</div>`;
                    }
                } else {
                    consoleDiv.innerHTML += `<div style="color: #00ffff">> ${input}</div>`;
                    consoleDiv.innerHTML += `<div style="color: #ff0000">Command not found: ${cmd}</div>`;
                }
            } catch (error) {
                consoleDiv.innerHTML += `<div style="color: #ff0000">Error: ${error.message}</div>`;
            }
            
            commandInput.value = '';
            consoleDiv.scrollTop = consoleDiv.scrollHeight;

            // Save command history after each command
            localStorage.setItem('commandHistory', JSON.stringify(this.commandHistory));
        }
    };

    // Initialize console
    consoleDiv.innerHTML = '<br>Welcome to 30S v1.0<br>Type "list" for available commands<br><br>';
    
    const commandInput = document.getElementById('command-input');
    const commandButton = document.getElementById('submit-command');
    
    commandInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== '') {
            os.runCommand(this.value);
        } else if (e.key === 'ArrowUp') {
            if (os.historyIndex > 0) {
                os.historyIndex--;
                this.value = os.commandHistory[os.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            if (os.historyIndex < os.commandHistory.length - 1) {
                os.historyIndex++;
                this.value = os.commandHistory[os.historyIndex];
            } else {
                os.historyIndex = os.commandHistory.length;
                this.value = '';
            }
        }
    });

    commandButton.addEventListener('click', function() {
        if (commandInput.value.trim() !== '') {
            os.runCommand(commandInput.value);
        }
    });
});
