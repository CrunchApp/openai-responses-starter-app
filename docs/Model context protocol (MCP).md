Model context protocol (MCP)

The Model Context Protocol (MCP) is a standard for connecting Large Language Models (LLMs) to external services.

This guide covers how to connect Supabase to the following AI tools using MCP:

Cursor
Windsurf (Codium)
Cline (VS Code extension)
Claude desktop
Claude code
Once connected, you can use natural language commands to run read-only database queries in the AI tool.

Connect to Supabase using MCP#
Supabase uses the Postgres MCP server to provide MCP access to your database. The MCP server runs all queries as read-only transactions.

Step 1: Find your database connection string#
To get started, you will need to retrieve your database connection string. These will differ depending on whether you are using a hosted or local instance of Supabase.

For a hosted Supabase instance#
Connection string (pooler session mode)
Arash / CrunchApp's Project
postgresql://postgres.npcikwechuwfhhkdvmtr:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres

Log in and choose a project above to find your connection string, or find it in the Dashboard:

Navigating to your project's Connection settings
Copying the connection string found under Session pooler.
Be sure to replace [YOUR-PASSWORD] with your database password.

For a local Supabase instance#
When running a local instance of Supabase via the CLI, you can find your connection string by running:

supabase status
or if you are using npx:

npx supabase status
This will output a list of details about your local Supabase instance. Copy the DB URL field in the output.

Step 2: Configure in your AI tool#
MCP compatible tools can connect to Supabase using the Postgres MCP server. Below are instructions on to connect to the Postgres MCP server using popular AI tools:

Cursor#
Open Cursor and create a .cursor directory in your project root if it doesn't exist.

Create a .cursor/mcp.json file if it doesn't exist and open it.

Add the following configuration:


macOS

Windows

Windows (WSL)

Linux
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "<connection-string>"]
    }
  }
}
Replace <connection-string> with your connection string.

Make sure that node and npx are available in your system PATH. Assuming node is installed, you can get the path by running:

npm config get prefix
Then add it to your system PATH by running:

setx PATH "%PATH%;<path-to-dir>"
Replacing <path-to-dir> with the path you got from the previous command.

Finally restart Cursor for the changes to take effect.

Save the configuration file.

Open Cursor and navigate to Settings/MCP. You should see a green active status after the server is successfully connected.

Windsurf#
Open Windsurf and navigate to the Cascade assistant.

Tap on the hammer (MCP) icon, then Configure to open the configuration file.

Add the following configuration:


macOS

Windows

Windows (WSL)

Linux
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "<connection-string>"]
    }
  }
}
Replace <connection-string> with your connection string.

Make sure that node and npx are available in your system PATH. Assuming node is installed, you can get the path by running:

npm config get prefix
Then add it to your system PATH by running:

setx PATH "%PATH%;<path-to-dir>"
Replacing <path-to-dir> with the path you got from the previous command.

Finally restart Windsurf for the changes to take effect.

Save the configuration file and reload by tapping Refresh in the Cascade assistant.

You should see a green active status after the server is successfully connected.

Cline#
Open the Cline extension in VS Code and tap the MCP Servers icon.

Tap Configure MCP Servers to open the configuration file.

Add the following configuration:


macOS

Windows

Windows (WSL)

Linux
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "<connection-string>"]
    }
  }
}
Replace <connection-string> with your connection string.

Make sure that node and npx are available in your system PATH. Assuming node is installed, you can get the path by running:

npm config get prefix
Then add it to your system PATH by running:

setx PATH "%PATH%;<path-to-dir>"
Replacing <path-to-dir> with the path you got from the previous command.

Finally restart VS Code for the changes to take effect.

Save the configuration file. Cline should automatically reload the configuration.

You should see a green active status after the server is successfully connected.

Claude desktop#
Open Claude desktop and navigate to Settings.

Under the Developer tab, tap Edit Config to open the configuration file.

Add the following configuration:


macOS

Windows

Windows (WSL)

Linux
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "<connection-string>"]
    }
  }
}
Replace <connection-string> with your connection string.

Make sure that node and npx are available in your system PATH. Assuming node is installed, you can get the path by running:

npm config get prefix
Then add it to your system PATH by running:

setx PATH "%PATH%;<path-to-dir>"
Replacing <path-to-dir> with the path you got from the previous command.

Finally restart Claude desktop for the changes to take effect.

Save the configuration file and restart Claude desktop.

From the new chat screen, you should see a hammer (MCP) icon appear with the new MCP server available.

Claude code#
Create a .mcp.json file in your project root if it doesn't exist.

Add the following configuration:


macOS

Windows

Windows (WSL)

Linux
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-postgres", "<connection-string>"]
    }
  }
}
Replace <connection-string> with your connection string.

Make sure that node and npx are available in your system PATH. Assuming node is installed, you can get the path by running:

npm config get prefix
Then add it to your system PATH by running:

setx PATH "%PATH%;<path-to-dir>"
Replacing <path-to-dir> with the path you got from the previous command.

Finally restart Claude code for the changes to take effect.

Save the configuration file.

Restart Claude code to apply the new configuration.

Next steps#
Your AI tool is now connected to Supabase using MCP. Try asking the AI tool to query your database using natural language commands.