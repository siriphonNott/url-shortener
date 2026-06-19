<template>
  <div class="px-4 lg:px-8 py-8">

    <!-- Page header -->
    <div class="text-center mb-10">
      <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100">Documentation</h1>
      <p class="mt-2 text-base text-gray-500 dark:text-slate-400">Everything you need to know about using blly.to – Link Shortener</p>
    </div>

    <div class="flex gap-8 items-start">

      <!-- TOC sidebar -->
      <aside class="hidden lg:block w-44 shrink-0 sticky top-6">
        <p class="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">On this page</p>
        <nav class="space-y-0.5">
          <a
            v-for="item in tocItems"
            :key="item.id"
            :href="`#${item.id}`"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors duration-150"
            :class="activeSection === item.id
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium'
              : 'text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-300'"
          >
            <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              :class="activeSection === item.id ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-slate-800'"
            >
              <component :is="'svg'" class="w-2.5 h-2.5" :class="activeSection === item.id ? 'text-blue-500' : 'text-gray-400 dark:text-slate-500'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="item.iconPath"
              />
            </span>
            {{ item.label }}
          </a>
        </nav>
      </aside>

      <!-- Content -->
      <div class="flex-1 min-w-0 space-y-6">

        <!-- Getting Started -->
        <section id="getting-started" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">Getting Started</h2>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">
            Welcome to the blly.to – Link Shortener documentation. This guide will help you get started with our URL shortening service.
          </p>
          <ul class="space-y-2">
            <li v-for="item in gettingStartedItems" :key="item" class="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
              <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span v-html="item" />
            </li>
          </ul>
        </section>

        <!-- URL Shortening -->
        <section id="url-shortening" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">URL Shortening</h2>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">Our URL shortening service provides several ways to create short links:</p>
          <ul class="space-y-2.5">
            <li v-for="item in urlShorteningItems" :key="item.label" class="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
              <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span><span class="font-semibold text-gray-800 dark:text-slate-200">{{ item.label }}:</span> {{ item.desc }}</span>
            </li>
          </ul>
        </section>

        <!-- Analytics -->
        <section id="analytics" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">Analytics</h2>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">Track your shortened URLs with our comprehensive analytics:</p>
          <ul class="space-y-2.5">
            <li v-for="item in analyticsItems" :key="item.label" class="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
              <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span><span class="font-semibold text-gray-800 dark:text-slate-200">{{ item.label }}:</span> {{ item.desc }}</span>
            </li>
          </ul>
        </section>

        <!-- API Reference -->
        <section id="api-reference" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6 space-y-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">API Reference</h2>
          </div>

          <p class="text-base text-gray-600 dark:text-slate-400">
            Our REST API allows you to programmatically manage your shortened URLs.
            The base API URL is
            <code class="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-lg font-semibold text-gray-700 dark:text-slate-300">{{ baseUrl }}</code>.
            You can find your API key on the <router-link to="/api-key" class="text-blue-600 dark:text-blue-400 underline underline-offset-2">API Key</router-link> page.
          </p>

          <!-- Auth note -->
          <div class="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-5 py-4">
            <svg class="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <p class="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              <span class="font-semibold">Authentication:</span>
              Add the header <code class="font-mono bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-md text-xs">X-API-Key: &lt;your-key&gt;</code> to every request.
            </p>
          </div>

          <!-- Endpoint list -->
          <div class="space-y-8">
            <div v-for="ep in endpoints" :key="ep.title" class="rounded-2xl border border-gray-200 dark:border-slate-700/60 overflow-hidden">
              <!-- Endpoint header -->
              <div class="flex items-start gap-4 px-6 py-5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700/60">
                <span class="text-sm font-bold px-3 py-1.5 rounded-lg font-mono shrink-0 tracking-wide" :class="methodClass(ep.method)">{{ ep.method }}</span>
                <div class="min-w-0">
                  <code class="text-base font-mono font-semibold text-gray-800 dark:text-slate-100 break-all">{{ ep.path }}</code>
                  <p class="mt-1 text-sm font-semibold text-gray-700 dark:text-slate-300">{{ ep.title }}</p>
                  <p class="mt-0.5 text-sm text-gray-500 dark:text-slate-500">{{ ep.desc }}</p>
                </div>
              </div>

              <div class="px-6 py-5 space-y-5">
                <!-- Body params -->
                <div v-if="ep.body">
                  <p class="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Request body</p>
                  <div class="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-700/60">
                    <div v-for="param in ep.body" :key="param.name"
                      class="flex items-start gap-4 px-4 py-3 text-sm bg-white dark:bg-slate-900">
                      <code class="font-mono text-blue-600 dark:text-blue-400 shrink-0 w-28">{{ param.name }}</code>
                      <span class="text-gray-400 dark:text-slate-600 shrink-0 w-16 text-xs mt-0.5">{{ param.type }}</span>
                      <span class="shrink-0 text-xs mt-0.5 font-medium" :class="param.required ? 'text-red-500' : 'text-gray-400 dark:text-slate-600'">
                        {{ param.required ? 'required' : 'optional' }}
                      </span>
                      <span class="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{{ param.desc }}</span>
                    </div>
                  </div>
                </div>

                <!-- Code tabs -->
                <div>
                  <div class="flex gap-1 mb-0">
                    <button
                      v-for="tab in ['cURL', 'JavaScript']"
                      :key="tab"
                      @click="setTab(ep.title, tab)"
                      class="text-sm px-4 py-2 rounded-t-xl font-medium transition-colors duration-150"
                      :class="activeTab(ep.title) === tab
                        ? 'bg-gray-950 text-slate-200'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'"
                    >{{ tab }}</button>
                  </div>
                  <div class="bg-gray-950 rounded-b-xl rounded-tr-xl overflow-x-auto">
                    <pre class="text-sm text-slate-300 font-mono leading-relaxed p-5">{{ activeTab(ep.title) === 'cURL' ? ep.curl : ep.js }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Error Codes -->
        <section id="error-codes" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6 space-y-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">Error Codes</h2>
          </div>

          <p class="text-base text-gray-600 dark:text-slate-400">
            All error responses follow a consistent structure with <code class="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-gray-700 dark:text-slate-300">success: false</code> and an <code class="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-gray-700 dark:text-slate-300">errorCode</code> field.
          </p>

          <!-- Error response example -->
          <div class="bg-gray-950 rounded-xl overflow-x-auto">
            <pre class="text-sm text-slate-300 font-mono leading-relaxed p-5">{
  "success": false,
  "errorCode": "LINK_NOT_FOUND",
  "message": "Link not found"
}</pre>
          </div>

          <!-- Error code table -->
          <div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/70">
                  <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Error Code</th>
                  <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap w-24">Status</th>
                  <th class="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-slate-700/60">
                <template v-for="group in errorGroups" :key="group.label">
                  <tr class="bg-gray-50/60 dark:bg-slate-800/30">
                    <td colspan="3" class="px-5 py-2.5">
                      <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full" :class="group.badgeClass">
                        <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {{ group.label }}
                      </span>
                    </td>
                  </tr>
                  <tr
                    v-for="err in group.codes"
                    :key="err.code"
                    class="bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors duration-100"
                  >
                    <td class="px-5 py-3.5">
                      <code class="font-mono text-sm font-semibold text-gray-800 dark:text-slate-200 tracking-tight">{{ err.code }}</code>
                    </td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg font-mono tabular-nums" :class="statusClass(err.status)">{{ err.status }}</span>
                    </td>
                    <td class="px-5 py-3.5 text-gray-500 dark:text-slate-400 leading-relaxed">{{ err.message }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </section>

        <!-- QR Codes -->
        <section id="qr-codes" class="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">QR Codes</h2>
            <span class="text-xs font-semibold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-700/40">Coming Soon</span>
          </div>
          <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">Generate and customize QR codes for your shortened URLs:</p>
          <ul class="space-y-2.5">
            <li v-for="item in qrItems" :key="item.label" class="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-400">
              <svg class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span><span class="font-semibold text-gray-800 dark:text-slate-200">{{ item.label }}:</span> {{ item.desc }}</span>
            </li>
          </ul>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const baseUrl = import.meta.env.VITE_API_URL || 'https://blly.to/api';

// TOC
const tocItems = [
  { id: 'getting-started', label: 'Getting Started', iconPath: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>' },
  { id: 'url-shortening', label: 'URL Shortening', iconPath: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>' },
  { id: 'analytics', label: 'Analytics', iconPath: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>' },
  { id: 'api-reference', label: 'API Reference', iconPath: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' },
  { id: 'error-codes', label: 'Error Codes', iconPath: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' },
  { id: 'qr-codes', label: 'QR Codes', iconPath: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>' },
];

const activeSection = ref('getting-started');

// Section content data
const gettingStartedItems = [
  'Create an account to access all features',
  `Get your API key from the <a href="/api-key" class="text-blue-600 dark:text-blue-400 underline">API Key page</a>`,
  'Start shortening URLs through the Dashboard or API',
];

const urlShorteningItems = [
  { label: 'Dashboard', desc: 'Use our web interface to create and manage links' },
  { label: 'API', desc: 'Integrate URL shortening into your applications using our REST API' },
  { label: 'Custom Code', desc: 'Optionally specify your own short code (e.g. blly.to/my-link)' },
];

const analyticsItems = [
  { label: 'Click Tracking', desc: 'Monitor total clicks per link and across your account' },
  { label: 'Geographic Data', desc: 'View clicks by country and city' },
  { label: 'Device Analytics', desc: 'Track clicks by device type and browser' },
  { label: 'Referrer Data', desc: 'See where your traffic is coming from (direct vs QR scans)' },
];

const qrItems = [
  { label: 'Dynamic QR Codes', desc: 'Automatically update when your destination URL changes' },
  { label: 'Customization', desc: 'Choose colors, size, and format' },
  { label: 'Analytics', desc: 'Track QR code scans alongside URL clicks' },
];

// API endpoints
const endpoints = [
  {
    title: 'Create Short Link',
    method: 'POST',
    path: '/v1/shorten',
    desc: 'Creates a new short link. Returns the created link object including the generated short code.',
    body: [
      { name: 'destinationUrl', type: 'string',   required: true,  desc: 'The destination URL to shorten' },
      { name: 'title',       type: 'string',   required: false, desc: 'A human-readable label for the link' },
      { name: 'code',        type: 'string',   required: false, desc: 'Custom short code — auto-generated if omitted' },
      { name: 'expiresAt',   type: 'ISO date', required: false, desc: 'Expiry date/time after which the link stops redirecting' },
    ],
    curl: `curl -X POST ${baseUrl}/shorten \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "destinationUrl": "https://example.com/very/long/url",
    "title": "My Link",
    "code": "my-link"
  }'`,
    js: `const res = await fetch('${baseUrl}/shorten', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    destinationUrl: 'https://example.com/very/long/url',
    title: 'My Link',
    code: 'my-link',
  }),
});

const link = await res.json();
// link.code  → "my-link"
// link._id   → MongoDB ID`,
  },
  {
    title: 'Delete Short Link',
    method: 'DELETE',
    path: '/v1/links/{code}',
    desc: 'Permanently deletes a short link and all its redirect logs by short code.',
    curl: `curl -X DELETE ${baseUrl}/links/my-link \\
  -H "X-API-Key: YOUR_API_KEY"`,
    js: `await fetch('${baseUrl}/links/my-link', {
  method: 'DELETE',
  headers: { 'X-API-Key': 'YOUR_API_KEY' },
});`,
  },
];

const errorGroups = [
  {
    label: 'Authentication',
    badgeClass: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    codes: [
      { code: 'AUTH_MISSING_FIELDS',      status: 400, message: 'Email and password are required' },
      { code: 'AUTH_EMAIL_EXISTS',         status: 400, message: 'Email already exists' },
      { code: 'AUTH_INVALID_CREDENTIALS', status: 401, message: 'Invalid email or password' },
      { code: 'AUTH_NO_TOKEN',            status: 401, message: 'No token provided' },
      { code: 'AUTH_INVALID_TOKEN',       status: 401, message: 'Invalid or expired token' },
      { code: 'AUTH_INVALID_API_KEY',     status: 401, message: 'Invalid API key' },
      { code: 'AUTH_MISSING_PW_FIELDS',   status: 400, message: 'currentPassword and newPassword are required' },
      { code: 'AUTH_WRONG_PASSWORD',      status: 400, message: 'Current password is incorrect' },
      { code: 'AUTH_WEAK_PASSWORD',       status: 400, message: 'Password must be at least 6 characters' },
    ],
  },
  {
    label: 'Link',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    codes: [
      { code: 'LINK_MISSING_URL',  status: 400, message: 'destinationUrl is required' },
      { code: 'LINK_CODE_EXISTS',  status: 400, message: 'Short code already exists' },
      { code: 'LINK_NOT_FOUND',    status: 404, message: 'Link not found' },
      { code: 'LINK_EXPIRED',      status: 410, message: 'This link has expired' },
    ],
  },
  {
    label: 'Server',
    badgeClass: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    codes: [
      { code: 'SERVER_ERROR', status: 500, message: 'Internal server error' },
    ],
  },
];

const statusClass = (status) => {
  if (status >= 500) return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
  if (status === 410) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
  if (status === 404) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
  if (status === 401) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
  if (status === 400) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
  return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400';
};

const methodClass = (method) => ({
  GET: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  POST: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  PUT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
}[method] || '');

// Code tab state per endpoint
const tabs = ref({});
const activeTab = (title) => tabs.value[title] || 'cURL';
const setTab = (title, tab) => { tabs.value[title] = tab; };

// Scrollspy
let observer;
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) activeSection.value = e.target.id;
      });
    },
    { rootMargin: '-20% 0px -70% 0px' }
  );
  tocItems.forEach((item) => {
    const el = document.getElementById(item.id);
    if (el) observer.observe(el);
  });
});
onBeforeUnmount(() => observer?.disconnect());
</script>
