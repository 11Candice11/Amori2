# ── Build stage ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore first (leverages layer caching when only source changes)
COPY Amori.Api.csproj ./
RUN dotnet restore Amori.Api.csproj

# Copy the rest of the source and publish a release build
COPY . ./
RUN dotnet publish Amori.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# Listen on 5001 inside the container (matches docker-compose ASPNETCORE_URLS)
EXPOSE 5001
ENTRYPOINT ["dotnet", "Amori.Api.dll"]
