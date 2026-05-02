using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Threading;
using System.Windows.Forms;

namespace Wbc3Planner
{
    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            Application.EnableVisualStyles();

            try
            {
                LauncherOptions options = LauncherOptions.Parse(args);
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
                if (ProcessLooksLikePlannerServer(process))
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

            if (edge != null)
            {
                ProcessStartInfo edgeStart = new ProcessStartInfo();
                edgeStart.FileName = edge;
                edgeStart.Arguments = "--app=" + Quote(url) + " --new-window";
                edgeStart.UseShellExecute = false;
                Process.Start(edgeStart);
                return;
            }

            ProcessStartInfo browserStart = new ProcessStartInfo();
            browserStart.FileName = url;
            browserStart.UseShellExecute = true;
            Process.Start(browserStart);
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

        private static string Quote(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }
    }
}
