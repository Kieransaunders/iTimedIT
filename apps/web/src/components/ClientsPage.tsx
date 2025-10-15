import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { notifyMutationError } from "../lib/notifyMutationError";
import { useOrganization } from "../lib/organization-context";
import { WorkspaceHeader, WorkspaceType } from "./WorkspaceSwitcher";
import { Button } from "./ui/button";
import { EnhancedClientTable } from "./EnhancedClientTable";
import { ClientMetricsCards } from "./ClientMetricsCards";
import { ClientFilters, defaultFilters } from "./ClientFilters";
import { ClientAnalytics } from "./ClientAnalytics";
import { ClientExportTools } from "./ClientExportTools";
import { LayoutGrid, Table2, Check, ChevronsUpDown } from "lucide-react";
import { Button as ShadcnButton } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

// Default color palette for clients
const DEFAULT_COLORS = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#f97316", // orange
  "#ec4899", // pink
];

// ISO 3166-1 country list
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain",
  "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
  "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia",
  "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe"
];

type ViewMode = 'table' | 'cards';

interface SortConfig {
  key: keyof any | null;
  direction: 'asc' | 'desc';
}

interface ClientsPageProps {
  workspaceType?: WorkspaceType;
  onWorkspaceChange?: (workspace: WorkspaceType) => void;
  onViewProjects?: (clientId: string) => void;
}

export function ClientsPage({
  workspaceType = "team",
  onWorkspaceChange,
  onViewProjects,
}: ClientsPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postCode, setPostCode] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const currentWorkspace = workspaceType; // Use prop instead of internal state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState(defaultFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [countryOpen, setCountryOpen] = useState(false);

  // Project creation modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectClientId, setProjectClientId] = useState<Id<"clients"> | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectHourlyRate, setProjectHourlyRate] = useState(100);
  const [projectBudgetType, setProjectBudgetType] = useState<"hours" | "amount">("hours");
  const [projectBudgetHours, setProjectBudgetHours] = useState<number | undefined>(undefined);
  const [projectBudgetAmount, setProjectBudgetAmount] = useState<number | undefined>(undefined);

  const { isReady } = useOrganization();

  const clients = useQuery(
    currentWorkspace === "personal" 
      ? api.personalClients.listPersonal
      : api.clients.list,
    isReady 
      ? (currentWorkspace === "personal" ? {} : { workspaceType: "team" })
      : "skip"
  );
  const createClient = useMutation(
    currentWorkspace === "personal" 
      ? api.personalClients.createPersonal
      : api.clients.create
  );
  const updateClient = useMutation(
    currentWorkspace === "personal"
      ? api.personalClients.updatePersonal
      : api.clients.update
  );
  const createProject = useMutation(
    currentWorkspace === "personal"
      ? api.personalProjects.createPersonal
      : api.projects.create
  );

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    if (!clients) return [];

    let filtered = clients.filter(client => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = client.name.toLowerCase().includes(searchLower);
        const matchesNote = client.note?.toLowerCase().includes(searchLower) || false;
        if (!matchesName && !matchesNote) return false;
      }

      // Revenue range filter
      if (client.totalAmountSpent < filters.revenueRange.min ||
          client.totalAmountSpent > filters.revenueRange.max) {
        return false;
      }

      // Activity filter
      if (filters.activityDays !== null) {
        if (client.daysSinceLastActivity === null || 
            client.daysSinceLastActivity > filters.activityDays) {
          return false;
        }
      }

      return true;
    });

    // Sort clients
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [clients, filters, sortConfig]);

  const handleSort = (key: keyof any) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCreateProject = (clientId: string) => {
    setProjectClientId(clientId as Id<"clients">);
    setShowProjectModal(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectClientId) return;

    try {
      await createProject({
        name: projectName,
        clientId: projectClientId,
        hourlyRate: projectHourlyRate,
        budgetType: projectBudgetType,
        budgetHours: projectBudgetType === "hours" ? projectBudgetHours : undefined,
        budgetAmount: projectBudgetType === "amount" ? projectBudgetAmount : undefined,
        ...(currentWorkspace === "team" && { workspaceType: "team" })
      });

      // Reset form
      setProjectName("");
      setProjectHourlyRate(100);
      setProjectBudgetType("hours");
      setProjectBudgetHours(undefined);
      setProjectBudgetAmount(undefined);
      setShowProjectModal(false);
      setProjectClientId(null);
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to create project. Please try again.",
        unauthorizedMessage: "You need owner or admin access to create projects.",
      });
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId as Id<"clients">);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleExportData = (format: 'csv' | 'pdf', scope: 'all' | 'filtered') => {
    // TODO: Track export analytics if needed
    console.log(`Exported ${scope} clients as ${format}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const address = street || city || country || postCode ? {
        street: street || undefined,
        city: city || undefined,
        country: country || undefined,
        postCode: postCode || undefined,
      } : undefined;

      if (editingClient) {
        await updateClient({
          id: editingClient._id,
          name,
          note,
          address,
          color,
        });
      } else {
        await createClient({ name, note, address, color });
      }

      setName("");
      setNote("");
      setStreet("");
      setCity("");
      setCountry("");
      setPostCode("");
      setColor("#8b5cf6");
      setShowForm(false);
      setEditingClient(null);
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: editingClient
          ? "Unable to update client. Please try again."
          : "Unable to create client. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage clients.",
      });
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setName(client.name);
    setNote(client.note || "");
    setStreet(client.address?.street || "");
    setCity(client.address?.city || "");
    setCountry(client.address?.country || "");
    setPostCode(client.address?.postCode || "");
    setColor(client.color || "#8b5cf6");
    setShowForm(true);
  };

  const handleArchive = async (clientId: Id<"clients">) => {
    try {
      await updateClient({ id: clientId, archived: true });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to archive client. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage clients.",
      });
    }
  };

  const handleUnarchive = async (clientId: Id<"clients">) => {
    try {
      await updateClient({ id: clientId, archived: false });
    } catch (error) {
      notifyMutationError(error, {
        fallbackMessage: "Unable to unarchive client. Please try again.",
        unauthorizedMessage: "You need owner or admin access to manage clients.",
      });
    }
  };

  if (!isReady || !clients) {
    return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>;
  }

  // Show individual client analytics if selected
  if (selectedClientId) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={() => setSelectedClientId(null)}
            variant="outline"
          >
            ← Back to Clients
          </Button>
        </div>
        <ClientAnalytics clientId={selectedClientId} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Workspace Header - Only show if onWorkspaceChange prop is not provided (for backwards compatibility) */}
      {!onWorkspaceChange && (
        <WorkspaceHeader
          currentWorkspace={currentWorkspace}
          onWorkspaceChange={(workspace) => {
            // This shouldn't happen since we're hiding the switcher
            console.warn("Workspace change requested but no handler provided");
          }}
        />
      )}

      {/* Header with controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 w-full">
            <ClientFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={resetFilters}
              totalClients={clients.length}
              filteredCount={filteredAndSortedClients.length}
            />
          </div>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors"
            >
              Add Client
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setViewMode('table')}
              className={`h-10 w-10 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              aria-label="Show table view"
              title="Table view"
            >
              <Table2 className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setViewMode('cards')}
              className={`h-10 w-10 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              aria-label="Show card view"
              title="Card view"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Client Creation/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingClient ? "Edit Client" : "Add New Client"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address (optional)
              </label>
              <div className="space-y-3">
                <div>
                  <label htmlFor="street" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="123 High Street"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="city" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="London"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="postCode" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Post Code
                    </label>
                    <input
                      type="text"
                      id="postCode"
                      value={postCode}
                      onChange={(e) => setPostCode(e.target.value)}
                      placeholder="SW1A 1AA"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Country
                  </label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <ShadcnButton
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between h-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        {country || "Select a country"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </ShadcnButton>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="start">
                      <Command className="bg-white dark:bg-gray-800">
                        <CommandInput
                          placeholder="Search country..."
                          className="h-9 text-gray-900 dark:text-gray-100"
                        />
                        <CommandList>
                          <CommandEmpty className="text-gray-500 dark:text-gray-400 py-6 text-center text-sm">
                            No country found.
                          </CommandEmpty>
                          <CommandGroup>
                            {COUNTRIES.map((countryName) => (
                              <CommandItem
                                key={countryName}
                                value={countryName}
                                onSelect={(currentValue) => {
                                  setCountry(currentValue === country ? "" : currentValue);
                                  setCountryOpen(false);
                                }}
                                className="text-gray-900 dark:text-gray-100"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    country === countryName ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {countryName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Color
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#8b5cf6"
                    className="px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-timer bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 w-24"
                  />
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {DEFAULT_COLORS.map((defaultColor) => (
                    <button
                      key={defaultColor}
                      type="button"
                      onClick={() => setColor(defaultColor)}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                        color === defaultColor ? 'border-white' : 'border-gray-400'
                      }`}
                      style={{ backgroundColor: defaultColor }}
                      title={defaultColor}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover shadow-lg transition-colors"
              >
                {editingClient ? "Update" : "Create"} Client
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                onClick={() => {
                  setShowForm(false);
                  setEditingClient(null);
                  setName("");
                  setNote("");
                  setStreet("");
                  setCity("");
                  setCountry("");
                  setPostCode("");
                  setColor("#8b5cf6");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client Display */}
      {viewMode === 'table' ? (
        <EnhancedClientTable
          clients={filteredAndSortedClients}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEditClient={handleEdit}
          onArchiveClient={handleArchive}
          onUnarchiveClient={handleUnarchive}
          onCreateProject={handleCreateProject}
          onClientSelect={handleClientSelect}
          onViewProjects={onViewProjects}
        />
      ) : (
        <ClientMetricsCards
          clients={filteredAndSortedClients}
          onClientSelect={handleClientSelect}
          onEditClient={handleEdit}
          onArchiveClient={handleArchive}
        />
      )}

      {/* Export Tools */}
      {filteredAndSortedClients.length > 0 && (
        <div className="mt-8">
          <ClientExportTools
            clients={clients || []}
            filteredClients={filteredAndSortedClients}
            onExportData={handleExportData}
          />
        </div>
      )}

      {/* Project Creation Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProjectSubmit} className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Name *
              </label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client
              </label>
              <Input
                value={clients?.find(c => c._id === projectClientId)?.name || ""}
                disabled
                className="bg-gray-100 dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hourly Rate *
              </label>
              <Input
                type="number"
                value={projectHourlyRate}
                onChange={(e) => setProjectHourlyRate(Number(e.target.value))}
                placeholder="100"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget Type
              </label>
              <select
                value={projectBudgetType}
                onChange={(e) => setProjectBudgetType(e.target.value as "hours" | "amount")}
                className="w-full h-10 px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="hours">Hours</option>
                <option value="amount">Amount</option>
              </select>
            </div>

            {projectBudgetType === "hours" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Hours
                </label>
                <Input
                  type="number"
                  value={projectBudgetHours || ""}
                  onChange={(e) => setProjectBudgetHours(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="40"
                  min="0"
                  step="0.5"
                />
              </div>
            )}

            {projectBudgetType === "amount" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Amount
                </label>
                <Input
                  type="number"
                  value={projectBudgetAmount || ""}
                  onChange={(e) => setProjectBudgetAmount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="4000"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Create Project
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowProjectModal(false);
                  setProjectName("");
                  setProjectHourlyRate(100);
                  setProjectBudgetType("hours");
                  setProjectBudgetHours(undefined);
                  setProjectBudgetAmount(undefined);
                  setProjectClientId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
