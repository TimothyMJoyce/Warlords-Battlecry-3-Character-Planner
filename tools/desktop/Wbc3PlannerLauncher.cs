using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace Wbc3Planner
{
    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            NativeTaskbarIdentity.ApplyToCurrentProcess();
            Application.EnableVisualStyles();

            try
            {
                LauncherOptions options = LauncherOptions.Parse(args);
                NativeTaskbarIdentity.RepairPinnedTaskbarShortcuts();
                if (options.ShowHelp)
                {
                    MessageBox.Show(
                        "WBC3 Planner.exe\n\n" +
                        "Options:\n" +
                        "  --refresh    Re-import HeroData and extracted assets before opening.\n" +
                        "  --stop       Stop the background planner server.\n" +
                        "  --port 5173  Start on a specific local port.\n" +
                        "  --no-open    Start the server without opening a browser window.",
                        "WBC3 Planner",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                    return 0;
                }

                LauncherContext context = BundleRuntime.Resolve();
                Launcher launcher = new Launcher(context.Root, context.NodePath);
                if (options.Stop)
                {
                    launcher.StopExistingServer(!options.NoOpen);
                    return 0;
                }

                launcher.Start(options);
                return 0;
            }
            catch (Exception error)
            {
                MessageBox.Show(error.Message, "WBC3 Planner", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
        }
    }

    internal static class NativeTaskbarIdentity
    {
        private const string AppUserModelId = "Codex.WBC3Planner.Desktop";
        private const string DisplayName = "WBC3 Planner";
        private const int StgmReadWrite = 2;
        private static readonly PROPERTYKEY PkeyAppUserModelRelaunchCommand = new PROPERTYKEY(new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), 2);
        private static readonly PROPERTYKEY PkeyAppUserModelRelaunchIconResource = new PROPERTYKEY(new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), 3);
        private static readonly PROPERTYKEY PkeyAppUserModelRelaunchDisplayNameResource = new PROPERTYKEY(new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), 4);
        private static readonly PROPERTYKEY PkeyAppUserModelId = new PROPERTYKEY(new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), 5);

        public static void ApplyToCurrentProcess()
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID(AppUserModelId);
            }
            catch
            {
            }
        }

        public static void RepairPinnedTaskbarShortcuts()
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            if (String.IsNullOrWhiteSpace(appData))
            {
                return;
            }

            string taskbarDirectory = Path.Combine(appData, "Microsoft", "Internet Explorer", "Quick Launch", "User Pinned", "TaskBar");
            if (!Directory.Exists(taskbarDirectory))
            {
                return;
            }

            string currentExe = CurrentExecutablePath();
            foreach (string shortcutPath in Directory.GetFiles(taskbarDirectory, "*.lnk"))
            {
                RepairPinnedShortcut(shortcutPath, currentExe);
            }
        }

        public static void ApplyToPlannerWindow(TimeSpan timeout)
        {
            DateTime deadline = DateTime.UtcNow.Add(timeout);
            while (DateTime.UtcNow < deadline)
            {
                if (ApplyToMatchingPlannerWindow())
                {
                    return;
                }

                Thread.Sleep(100);
            }
        }

        private static void RepairPinnedShortcut(string shortcutPath, string currentExe)
        {
            object shortcut = null;
            try
            {
                shortcut = new CShellLink();
                System.Runtime.InteropServices.ComTypes.IPersistFile file = (System.Runtime.InteropServices.ComTypes.IPersistFile)shortcut;
                file.Load(shortcutPath, StgmReadWrite);

                if (!ShortcutTargetsCurrentExecutable((IShellLinkW)shortcut, currentExe))
                {
                    return;
                }

                string iconPath = FindPlannerIconPath(currentExe);
                ((IShellLinkW)shortcut).SetIconLocation(iconPath, 0);
                IPropertyStore store = (IPropertyStore)shortcut;
                SetPlannerProperties(store, currentExe, iconPath);
                file.Save(shortcutPath, true);
            }
            catch
            {
            }
            finally
            {
                if (shortcut != null && Marshal.IsComObject(shortcut))
                {
                    Marshal.ReleaseComObject(shortcut);
                }
            }
        }

        private static bool ShortcutTargetsCurrentExecutable(IShellLinkW shortcut, string currentExe)
        {
            StringBuilder target = new StringBuilder(1024);
            shortcut.GetPath(target, target.Capacity, IntPtr.Zero, 0);
            string targetPath = target.ToString();
            if (String.IsNullOrWhiteSpace(targetPath))
            {
                return false;
            }

            try
            {
                return String.Equals(Path.GetFullPath(targetPath), currentExe, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        private static bool ApplyToMatchingPlannerWindow()
        {
            bool applied = false;
            EnumWindows(delegate(IntPtr hwnd, IntPtr lParam)
            {
                if (!applied && WindowLooksLikePlanner(hwnd))
                {
                    applied = ApplyToWindow(hwnd);
                }

                return true;
            }, IntPtr.Zero);
            return applied;
        }

        private static bool WindowLooksLikePlanner(IntPtr hwnd)
        {
            if (!IsWindowVisible(hwnd))
            {
                return false;
            }

            string title = GetWindowTitle(hwnd);
            if (title.IndexOf("Warlords Battlecry 3 - Character Planner", StringComparison.OrdinalIgnoreCase) < 0 &&
                title.IndexOf("WBC3 Planner", StringComparison.OrdinalIgnoreCase) < 0)
            {
                return false;
            }

            uint processId;
            GetWindowThreadProcessId(hwnd, out processId);
            try
            {
                Process process = Process.GetProcessById((int)processId);
                return process.ProcessName.IndexOf("edge", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    process.ProcessName.IndexOf("webview", StringComparison.OrdinalIgnoreCase) >= 0;
            }
            catch
            {
                return false;
            }
        }

        private static bool ApplyToWindow(IntPtr hwnd)
        {
            IPropertyStore store = null;
            try
            {
                Guid propertyStoreGuid = typeof(IPropertyStore).GUID;
                int result = SHGetPropertyStoreForWindow(hwnd, ref propertyStoreGuid, out store);
                if (result != 0 || store == null)
                {
                    return false;
                }

                string currentExe = CurrentExecutablePath();
                SetPlannerProperties(store, currentExe, FindPlannerIconPath(currentExe));
                return true;
            }
            catch
            {
                return false;
            }
            finally
            {
                if (store != null && Marshal.IsComObject(store))
                {
                    Marshal.ReleaseComObject(store);
                }
            }
        }

        private static void SetPlannerProperties(IPropertyStore store, string executablePath, string iconPath)
        {
            SetStringProperty(store, PkeyAppUserModelId, AppUserModelId);
            SetStringProperty(store, PkeyAppUserModelRelaunchCommand, QuoteCommand(executablePath));
            SetStringProperty(store, PkeyAppUserModelRelaunchDisplayNameResource, DisplayName);
            SetStringProperty(store, PkeyAppUserModelRelaunchIconResource, iconPath + ",0");
            store.Commit();
        }

        private static void SetStringProperty(IPropertyStore store, PROPERTYKEY key, string value)
        {
            PropVariant propertyValue = PropVariant.FromString(value);
            try
            {
                store.SetValue(ref key, ref propertyValue);
            }
            finally
            {
                propertyValue.Dispose();
            }
        }

        private static string CurrentExecutablePath()
        {
            return Path.GetFullPath(Application.ExecutablePath);
        }

        private static string FindPlannerIconPath(string executablePath)
        {
            string exeDirectory = Path.GetDirectoryName(executablePath);
            string currentDirectory = Directory.GetCurrentDirectory();
            string iconPath = FirstExistingFile(new string[]
            {
                String.IsNullOrWhiteSpace(exeDirectory) ? null : Path.Combine(exeDirectory, "src", "app-assets", "app-icon.ico"),
                String.IsNullOrWhiteSpace(currentDirectory) ? null : Path.Combine(currentDirectory, "src", "app-assets", "app-icon.ico")
            });

            return iconPath ?? executablePath;
        }

        private static string FirstExistingFile(IEnumerable<string> candidates)
        {
            foreach (string candidate in candidates)
            {
                if (!String.IsNullOrWhiteSpace(candidate) && File.Exists(candidate))
                {
                    return Path.GetFullPath(candidate);
                }
            }

            return null;
        }

        private static string QuoteCommand(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private static string GetWindowTitle(IntPtr hwnd)
        {
            int length = GetWindowTextLength(hwnd);
            if (length <= 0)
            {
                return "";
            }

            StringBuilder title = new StringBuilder(length + 1);
            GetWindowText(hwnd, title, title.Capacity);
            return title.ToString();
        }

        [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
        private static extern int SetCurrentProcessExplicitAppUserModelID(string appID);

        [DllImport("shell32.dll")]
        private static extern int SHGetPropertyStoreForWindow(IntPtr hwnd, ref Guid riid, out IPropertyStore propertyStore);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc enumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr hwnd);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int maxCount);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowTextLength(IntPtr hwnd);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);

        private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

        [ComImport]
        [Guid("00021401-0000-0000-C000-000000000046")]
        private class CShellLink
        {
        }

        [ComImport]
        [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        [Guid("000214F9-0000-0000-C000-000000000046")]
        private interface IShellLinkW
        {
            void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder file, int maxPath, IntPtr findData, uint flags);
            void GetIDList(out IntPtr idList);
            void SetIDList(IntPtr idList);
            void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder name, int maxName);
            void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string name);
            void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder directory, int maxPath);
            void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string directory);
            void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder args, int maxPath);
            void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string args);
            void GetHotkey(out short hotkey);
            void SetHotkey(short hotkey);
            void GetShowCmd(out int showCommand);
            void SetShowCmd(int showCommand);
            void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder iconPath, int maxIconPath, out int iconIndex);
            void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string iconPath, int iconIndex);
            void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string path, uint reserved);
            void Resolve(IntPtr hwnd, uint flags);
            void SetPath([MarshalAs(UnmanagedType.LPWStr)] string path);
        }

        [ComImport]
        [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        [Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
        private interface IPropertyStore
        {
            [PreserveSig]
            int GetCount(out uint propertyCount);

            [PreserveSig]
            int GetAt(uint propertyIndex, out PROPERTYKEY key);

            [PreserveSig]
            int GetValue(ref PROPERTYKEY key, out PropVariant value);

            [PreserveSig]
            int SetValue(ref PROPERTYKEY key, ref PropVariant value);

            [PreserveSig]
            int Commit();
        }

        [StructLayout(LayoutKind.Sequential, Pack = 4)]
        private struct PROPERTYKEY
        {
            public readonly Guid FormatId;
            public readonly uint PropertyId;

            public PROPERTYKEY(Guid formatId, uint propertyId)
            {
                this.FormatId = formatId;
                this.PropertyId = propertyId;
            }
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct PropVariant : IDisposable
        {
            [FieldOffset(0)]
            private ushort valueType;

            [FieldOffset(8)]
            private IntPtr pointerValue;

            public static PropVariant FromString(string value)
            {
                PropVariant variant = new PropVariant();
                variant.valueType = 31;
                variant.pointerValue = Marshal.StringToCoTaskMemUni(value);
                return variant;
            }

            public void Dispose()
            {
                PropVariantClear(ref this);
            }

            [DllImport("ole32.dll")]
            private static extern int PropVariantClear(ref PropVariant variant);
        }
    }

    internal sealed class LauncherOptions
    {
        public bool RefreshLocalData;
        public bool Stop;
        public bool ShowHelp;
        public bool NoOpen;
        public int Port = 5173;

        public static LauncherOptions Parse(string[] args)
        {
            LauncherOptions options = new LauncherOptions();

            for (int index = 0; index < args.Length; index += 1)
            {
                string value = args[index].Trim();
                string lower = value.ToLowerInvariant();

                if (lower == "--refresh" || lower == "/refresh")
                {
                    options.RefreshLocalData = true;
                }
                else if (lower == "--stop" || lower == "/stop")
                {
                    options.Stop = true;
                }
                else if (lower == "--help" || lower == "/?" || lower == "-h")
                {
                    options.ShowHelp = true;
                }
                else if (lower == "--no-open" || lower == "/no-open" || lower == "--no-browser" || lower == "/no-browser")
                {
                    options.NoOpen = true;
                }
                else if (lower == "--port" || lower == "/port")
                {
                    if (index + 1 >= args.Length)
                    {
                        throw new InvalidOperationException("Missing port number after " + value + ".");
                    }

                    int port;
                    if (!Int32.TryParse(args[index + 1], out port) || port < 1 || port > 65535)
                    {
                        throw new InvalidOperationException("Invalid local port: " + args[index + 1] + ".");
                    }

                    options.Port = port;
                    index += 1;
                }
                else
                {
                    throw new InvalidOperationException("Unknown option: " + value + ".");
                }
            }

            return options;
        }
    }

    internal sealed class LauncherContext
    {
        public readonly string Root;
        public readonly string NodePath;

        public LauncherContext(string root, string nodePath)
        {
            this.Root = root;
            this.NodePath = nodePath;
        }
    }

    internal static class ProjectRoot
    {
        public static string Find()
        {
            string exeDirectory = AppDomain.CurrentDomain.BaseDirectory;
            string currentDirectory = Directory.GetCurrentDirectory();

            string root = FirstExistingProjectRoot(new string[]
            {
                exeDirectory,
                Directory.GetParent(exeDirectory) == null ? null : Directory.GetParent(exeDirectory).FullName,
                currentDirectory,
                Directory.GetParent(currentDirectory) == null ? null : Directory.GetParent(currentDirectory).FullName
            });

            if (root == null)
            {
                throw new InvalidOperationException(
                    "Could not find the planner files. Keep WBC3 Planner.exe in the same folder as index.html and the tools folder.");
            }

            return root;
        }

        private static string FirstExistingProjectRoot(IEnumerable<string> candidates)
        {
            foreach (string candidate in candidates)
            {
                if (String.IsNullOrWhiteSpace(candidate))
                {
                    continue;
                }

                string root = Path.GetFullPath(candidate);
                if (File.Exists(Path.Combine(root, "index.html")) &&
                    File.Exists(Path.Combine(root, "tools", "server.mjs")))
                {
                    return root;
                }
            }

            return null;
        }
    }

    internal static class BundleRuntime
    {
        private const string PayloadResourceName = "Wbc3Planner.Payload.zip";

        public static LauncherContext Resolve()
        {
            byte[] payload = ReadPayload();
            if (payload == null)
            {
                return new LauncherContext(ProjectRoot.Find(), null);
            }

            string fingerprint = ComputeFingerprint(payload);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (String.IsNullOrWhiteSpace(localAppData))
            {
                localAppData = Path.GetTempPath();
            }

            string bundleRoot = Path.Combine(localAppData, "WBC3 Planner", "bundle-" + fingerprint);
            string readyFile = Path.Combine(bundleRoot, ".payload-ready");

            if (!File.Exists(readyFile))
            {
                if (Directory.Exists(bundleRoot))
                {
                    Directory.Delete(bundleRoot, true);
                }

                Directory.CreateDirectory(bundleRoot);
                ExtractPayload(payload, bundleRoot);
                File.WriteAllText(readyFile, fingerprint);
            }

            string nodePath = Path.Combine(bundleRoot, "runtime", "node.exe");
            string serverPath = Path.Combine(bundleRoot, "tools", "server.mjs");
            if (!File.Exists(nodePath) || !File.Exists(serverPath))
            {
                throw new InvalidOperationException("The bundled planner payload is incomplete.");
            }

            return new LauncherContext(bundleRoot, nodePath);
        }

        private static byte[] ReadPayload()
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            using (Stream stream = assembly.GetManifestResourceStream(PayloadResourceName))
            {
                if (stream == null)
                {
                    return null;
                }

                using (MemoryStream memory = new MemoryStream())
                {
                    stream.CopyTo(memory);
                    return memory.ToArray();
                }
            }
        }

        private static string ComputeFingerprint(byte[] payload)
        {
            using (SHA256 sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(payload);
                return BitConverter.ToString(hash).Replace("-", "").Substring(0, 16).ToLowerInvariant();
            }
        }

        private static void ExtractPayload(byte[] payload, string destination)
        {
            string destinationRoot = Path.GetFullPath(destination);
            if (!destinationRoot.EndsWith(Path.DirectorySeparatorChar.ToString()))
            {
                destinationRoot += Path.DirectorySeparatorChar;
            }

            using (MemoryStream memory = new MemoryStream(payload))
            using (ZipArchive archive = new ZipArchive(memory, ZipArchiveMode.Read))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string normalizedName = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                    string targetPath = Path.GetFullPath(Path.Combine(destinationRoot, normalizedName));
                    if (!targetPath.StartsWith(destinationRoot, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("Refusing to extract an unsafe bundled path.");
                    }

                    if (String.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(targetPath);
                        continue;
                    }

                    string targetDirectory = Path.GetDirectoryName(targetPath);
                    if (!String.IsNullOrWhiteSpace(targetDirectory))
                    {
                        Directory.CreateDirectory(targetDirectory);
                    }

                    using (Stream input = entry.Open())
                    using (FileStream output = File.Create(targetPath))
                    {
                        input.CopyTo(output);
                    }
                }
            }
        }
    }

    internal sealed class Launcher
    {
        private const string EdgeIconCacheVersion = "wbc3-planner-cog-icon-20260504";
        private readonly string root;
        private readonly string bundledNode;
        private readonly string dist;
        private readonly string serverUrlFile;
        private readonly string pidFile;

        public Launcher(string root, string bundledNode)
        {
            this.root = root;
            this.bundledNode = bundledNode;
            this.dist = Path.Combine(root, "dist");
            this.serverUrlFile = Path.Combine(this.dist, "server-url.txt");
            this.pidFile = Path.Combine(this.dist, "server.pid");
        }

        public void Start(LauncherOptions options)
        {
            Directory.CreateDirectory(this.dist);
            DeleteIfExists(this.serverUrlFile);

            string node = this.bundledNode ?? FindNode();

            if (options.RefreshLocalData)
            {
                RunOptionalNodeTool(node, Path.Combine(this.root, "tools", "import-hero-data.mjs"));
                RunOptionalNodeTool(node, Path.Combine(this.root, "tools", "extract-portraits.mjs"));
                RunOptionalNodeTool(node, Path.Combine(this.root, "tools", "extract-ui-icons.mjs"));
            }

            StopExistingServer(false);

            string serverScript = Path.Combine(this.root, "tools", "server.mjs");
            ProcessStartInfo serverStart = new ProcessStartInfo();
            serverStart.FileName = node;
            serverStart.Arguments = Quote(serverScript);
            serverStart.WorkingDirectory = this.root;
            serverStart.UseShellExecute = false;
            serverStart.CreateNoWindow = true;
            serverStart.WindowStyle = ProcessWindowStyle.Hidden;
            serverStart.RedirectStandardError = true;
            serverStart.RedirectStandardOutput = true;
            serverStart.EnvironmentVariables["PORT"] = options.Port.ToString();

            Process server = Process.Start(serverStart);
            if (server == null)
            {
                throw new InvalidOperationException("Could not start the planner server.");
            }

            File.WriteAllText(this.pidFile, server.Id.ToString());

            string url = WaitForServerUrl(server);
            if (!options.NoOpen)
            {
                OpenPlannerWindow(url);
            }
        }

        public void StopExistingServer(bool showMessage)
        {
            int stoppedCount = 0;
            int checkedCount = 0;
            foreach (string candidatePidFile in FindPlannerPidFiles())
            {
                checkedCount += 1;
                if (StopServerFromPidFile(candidatePidFile))
                {
                    stoppedCount += 1;
                }
            }

            if (showMessage)
            {
                MessageBox.Show(
                    stoppedCount > 0
                        ? "Stopped " + stoppedCount + " WBC3 planner server" + (stoppedCount == 1 ? "." : "s.")
                        : checkedCount > 0
                            ? "No matching WBC3 planner server process was running."
                            : "No WBC3 planner server pid file was found.",
                    "WBC3 Planner",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
        }

        private bool StopServerFromPidFile(string pidFilePath)
        {
            string text;
            try
            {
                text = File.ReadAllText(pidFilePath).Trim();
            }
            catch
            {
                DeleteIfExists(pidFilePath);
                return false;
            }

            int processId;
            if (!Int32.TryParse(text, out processId))
            {
                DeleteIfExists(pidFilePath);
                return false;
            }

            bool stopped = false;
            try
            {
                Process process = Process.GetProcessById(processId);
                if (ProcessLooksLikePlannerServer(process) && ProcessMatchesPidFile(process, pidFilePath))
                {
                    process.Kill();
                    process.WaitForExit(3000);
                    stopped = true;
                }
            }
            catch
            {
                stopped = false;
            }

            DeleteIfExists(pidFilePath);
            return stopped;
        }

        private IEnumerable<string> FindPlannerPidFiles()
        {
            HashSet<string> paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddIfFile(paths, this.pidFile);

            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (!String.IsNullOrWhiteSpace(localAppData))
            {
                string plannerRoot = Path.Combine(localAppData, "WBC3 Planner");
                try
                {
                    if (Directory.Exists(plannerRoot))
                    {
                        foreach (string file in Directory.GetFiles(plannerRoot, "server.pid", SearchOption.AllDirectories))
                        {
                            AddIfFile(paths, file);
                        }
                    }
                }
                catch
                {
                }
            }

            return paths;
        }

        private static void AddIfFile(HashSet<string> paths, string path)
        {
            try
            {
                if (!String.IsNullOrWhiteSpace(path) && File.Exists(path))
                {
                    paths.Add(Path.GetFullPath(path));
                }
            }
            catch
            {
            }
        }

        private static string FindNode()
        {
            string fromPath = FindExecutableOnPath("node.exe");
            if (fromPath != null)
            {
                return fromPath;
            }

            string userProfile = Environment.GetEnvironmentVariable("USERPROFILE");
            string localAppData = Environment.GetEnvironmentVariable("LOCALAPPDATA");
            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            string node = FirstExistingFile(new string[]
            {
                CombineIfRoot(userProfile, ".cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe"),
                CombineIfRoot(localAppData, "Programs\\nodejs\\node.exe"),
                CombineIfRoot(programFiles, "nodejs\\node.exe"),
                CombineIfRoot(programFilesX86, "nodejs\\node.exe")
            });

            if (node == null)
            {
                throw new InvalidOperationException("Node.js was not found. Install Node.js, then run WBC3 Planner.exe again.");
            }

            return node;
        }

        private static string FindEdge()
        {
            string fromPath = FindExecutableOnPath("msedge.exe");
            if (fromPath != null)
            {
                return fromPath;
            }

            string localAppData = Environment.GetEnvironmentVariable("LOCALAPPDATA");
            string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string programFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            return FirstExistingFile(new string[]
            {
                CombineIfRoot(programFilesX86, "Microsoft\\Edge\\Application\\msedge.exe"),
                CombineIfRoot(programFiles, "Microsoft\\Edge\\Application\\msedge.exe"),
                CombineIfRoot(localAppData, "Microsoft\\Edge\\Application\\msedge.exe")
            });
        }

        private static string FindExecutableOnPath(string executable)
        {
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] entries = path.Split(new char[] { Path.PathSeparator }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string entry in entries)
            {
                try
                {
                    string candidate = Path.Combine(entry.Trim(), executable);
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
                catch
                {
                }
            }

            return null;
        }

        private static string FirstExistingFile(IEnumerable<string> candidates)
        {
            foreach (string candidate in candidates)
            {
                if (!String.IsNullOrWhiteSpace(candidate) && File.Exists(candidate))
                {
                    return Path.GetFullPath(candidate);
                }
            }

            return null;
        }

        private static string CombineIfRoot(string root, string child)
        {
            if (String.IsNullOrWhiteSpace(root))
            {
                return null;
            }

            return Path.Combine(root, child);
        }

        private void RunOptionalNodeTool(string node, string scriptPath)
        {
            if (!File.Exists(scriptPath))
            {
                return;
            }

            ProcessStartInfo start = new ProcessStartInfo();
            start.FileName = node;
            start.Arguments = Quote(scriptPath);
            start.WorkingDirectory = this.root;
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            start.RedirectStandardError = true;
            start.RedirectStandardOutput = true;

            Process process = Process.Start(start);
            if (process == null)
            {
                return;
            }

            process.WaitForExit();
            if (process.ExitCode != 0)
            {
                string error = process.StandardError.ReadToEnd().Trim();
                MessageBox.Show(
                    "Skipped " + Path.GetFileName(scriptPath) + "." + Environment.NewLine + Environment.NewLine + error,
                    "WBC3 Planner",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning);
            }
        }

        private string WaitForServerUrl(Process server)
        {
            for (int index = 0; index < 80; index += 1)
            {
                Thread.Sleep(100);

                if (File.Exists(this.serverUrlFile))
                {
                    string url = File.ReadAllText(this.serverUrlFile).Trim();
                    if (!String.IsNullOrWhiteSpace(url))
                    {
                        return url;
                    }
                }

                server.Refresh();
                if (server.HasExited)
                {
                    string details = ReadProcessOutput(server);
                    throw new InvalidOperationException(
                        "The planner server exited before it wrote a URL." +
                        (String.IsNullOrWhiteSpace(details) ? "" : Environment.NewLine + Environment.NewLine + details));
                }
            }

            throw new TimeoutException("Timed out waiting for the planner server to start.");
        }

        private static void OpenPlannerWindow(string url)
        {
            string edge = FindEdge();
            string windowArgs = GetMaximizedWindowArguments();

            if (edge != null)
            {
                string profileDir = GetEdgeProfileDir();
                ProcessStartInfo edgeStart = new ProcessStartInfo();
                edgeStart.FileName = edge;
                edgeStart.Arguments =
                    "--user-data-dir=" + Quote(profileDir) +
                    " --no-first-run --app=" + Quote(url) +
                    " --new-window --start-maximized" + windowArgs;
                edgeStart.UseShellExecute = false;
                edgeStart.WindowStyle = ProcessWindowStyle.Maximized;
                Process.Start(edgeStart);
                NativeTaskbarIdentity.ApplyToPlannerWindow(TimeSpan.FromSeconds(6));
                return;
            }

            ProcessStartInfo browserStart = new ProcessStartInfo();
            browserStart.FileName = url;
            browserStart.UseShellExecute = true;
            browserStart.WindowStyle = ProcessWindowStyle.Maximized;
            Process.Start(browserStart);
        }

        private static string GetMaximizedWindowArguments()
        {
            try
            {
                var area = Screen.PrimaryScreen.WorkingArea;
                return " --window-position=" + area.Left + "," + area.Top +
                    " --window-size=" + area.Width + "," + area.Height;
            }
            catch
            {
                return "";
            }
        }

        private static string GetEdgeProfileDir()
        {
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (String.IsNullOrWhiteSpace(localAppData))
            {
                localAppData = Path.GetTempPath();
            }

            string profileDir = Path.Combine(localAppData, "WBC3 Planner", "edge-profile");
            Directory.CreateDirectory(profileDir);
            ClearEdgeIconCacheIfNeeded(profileDir);
            return profileDir;
        }

        private static void ClearEdgeIconCacheIfNeeded(string profileDir)
        {
            string markerFile = Path.Combine(profileDir, ".app-icon-cache-version");
            try
            {
                if (File.Exists(markerFile) && File.ReadAllText(markerFile).Trim() == EdgeIconCacheVersion)
                {
                    return;
                }
            }
            catch
            {
            }

            string defaultProfile = Path.Combine(profileDir, "Default");
            DeleteIfExists(Path.Combine(defaultProfile, "Favicons"));
            DeleteIfExists(Path.Combine(defaultProfile, "Favicons-journal"));
            DeleteIfExists(Path.Combine(defaultProfile, "HubApps Icons"));
            DeleteIfExists(Path.Combine(defaultProfile, "HubApps Icons-journal"));
            DeleteIfExists(Path.Combine(defaultProfile, "Shortcuts"));
            DeleteIfExists(Path.Combine(defaultProfile, "Shortcuts-journal"));
            DeleteDirectoryIfExists(Path.Combine(defaultProfile, "JumpListIconsRecentClosed"));
            DeleteDirectoryIfExists(Path.Combine(defaultProfile, "JumpListIconsRecentWorkspacesV2"));
            DeleteDirectoryIfExists(Path.Combine(defaultProfile, "Cache"));
            DeleteDirectoryIfExists(Path.Combine(defaultProfile, "Code Cache"));

            try
            {
                Directory.CreateDirectory(profileDir);
                File.WriteAllText(markerFile, EdgeIconCacheVersion);
            }
            catch
            {
            }
        }

        private static bool ProcessLooksLikePlannerServer(Process process)
        {
            try
            {
                return process.ProcessName.IndexOf("node", StringComparison.OrdinalIgnoreCase) >= 0;
            }
            catch
            {
                return false;
            }
        }

        private static bool ProcessMatchesPidFile(Process process, string pidFilePath)
        {
            try
            {
                DateTime processStarted = process.StartTime.ToUniversalTime();
                DateTime pidFileWritten = File.GetLastWriteTimeUtc(pidFilePath);
                return processStarted <= pidFileWritten.AddSeconds(10);
            }
            catch
            {
                return false;
            }
        }

        private static string ReadProcessOutput(Process process)
        {
            try
            {
                string output = process.StandardOutput.ReadToEnd().Trim();
                string error = process.StandardError.ReadToEnd().Trim();
                string combined = (output + Environment.NewLine + error).Trim();
                if (combined.Length > 1800)
                {
                    return combined.Substring(combined.Length - 1800);
                }

                return combined;
            }
            catch
            {
                return "";
            }
        }

        private static void DeleteIfExists(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch
            {
            }
        }

        private static void DeleteDirectoryIfExists(string path)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }
            }
            catch
            {
            }
        }

        private static string Quote(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }
    }
}
